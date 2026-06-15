type SketchOptions = {
  apiBaseUrl: string;
  dispositivoId: number;
};

export function generateEsp32CamSnapshotSketch(options: SketchOptions): string {
  const id = options.dispositivoId;

  return `#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ===== WIFI =====
static const char* WIFI_SSID = "SUA_REDE";
static const char* WIFI_PASS = "SUA_SENHA";

// ⚠️ NÃO usar localhost
static const char* API_BASE = "http://SEU_IP:3001";

static const int DISPOSITIVO_ID = ${id};
static const char* DEVICE_TOKEN = "";

// ===== PINOS =====
static const int PIN_DS18B20 = 13;
static const int PIN_PORTA = 14;
static const int PIN_BUZZER = 15;
static const int PIN_PANICO = 27;

// ===== TEMPOS =====
static const unsigned long CONFIG_REFRESH_MS = 5UL * 60UL * 1000UL;
static const unsigned long REALTIME_READING_MS = 30UL * 1000UL;

// ===== CONFIG =====
struct DeviceConfig {
  float tMin = -20;
  float tMax = -15;
  String h1 = "07:00";
  String h2 = "15:00";
  String h3 = "22:00";
};

DeviceConfig cfg;

// ===== ESTADOS =====
unsigned long lastConfigFetch = 0;
unsigned long lastRealtimeReading = 0;

bool doorOpen = false;
time_t doorOpenSince = 0;

bool sirenePanico = false;
bool sirenePorta = false;
bool sireneTemperatura = false;
bool alarmePortaJaEnviado = false;
bool tempForaJaEnviado = false;

int lastPanicoState = HIGH;
unsigned long lastDebounceMs = 0;

// ===== SENSORES =====
OneWire oneWire(PIN_DS18B20);
DallasTemperature sensors(&oneWire);

// ===== FUNÇÕES =====

String isoNow() {
  time_t now = time(nullptr);
  struct tm tm{};
  gmtime_r(&now, &tm);
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm);
  return String(buf);
}

String hhMmUtc() {
  time_t now = time(nullptr);
  struct tm tm{};
  gmtime_r(&now, &tm);
  char buf[6];
  strftime(buf, sizeof(buf), "%H:%M", &tm);
  return String(buf);
}

bool httpPostJson(const String& path, const String& json) {
  WiFiClient client;
  HTTPClient http;

  http.begin(client, String(API_BASE) + path);
  http.addHeader("Content-Type", "application/json");

  if (String(DEVICE_TOKEN).length() > 0)
    http.addHeader("x-device-token", DEVICE_TOKEN);

  int code = http.POST(json);
  http.end();

  return code >= 200 && code < 300;
}

bool httpGetJson(const String& path, String& out) {
  WiFiClient client;
  HTTPClient http;

  http.begin(client, String(API_BASE) + path);

  if (String(DEVICE_TOKEN).length() > 0)
    http.addHeader("x-device-token", DEVICE_TOKEN);

  int code = http.GET();

  if (code >= 200 && code < 300)
    out = http.getString();

  http.end();

  return code >= 200 && code < 300;
}

void sendLeitura(float t, const char* tipo) {
  String json =
    String("{\\"dispositivo_id\\":") + DISPOSITIVO_ID +
    ",\\"temperatura\\":" + String(t, 2) +
    ",\\"tipo_registro\\":\\"" + tipo + "\\"" +
    ",\\"data_hora\\":\\"" + isoNow() + "\\"}";

  httpPostJson("/api/leituras", json);
}

void sendEvento(const char* tipoEvento, int duracaoSeg = -1) {
  String json =
    String("{\\"dispositivo_id\\":") + DISPOSITIVO_ID +
    ",\\"tipo_evento\\":\\"" + tipoEvento + "\\"" +
    ",\\"data_hora\\":\\"" + isoNow() + "\\"";

  if (duracaoSeg >= 0)
    json += String(",\\"duracao_segundos\\":") + duracaoSeg;

  json += "}";

  httpPostJson("/api/eventos", json);
}

void fetchConfig() {
  String body;

  if (!httpGetJson(String("/api/dispositivos/") + DISPOSITIVO_ID + "/config", body))
    return;

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, body)) return;

  if (doc["temperatura_min"].is<float>())
    cfg.tMin = doc["temperatura_min"];

  if (doc["temperatura_max"].is<float>())
    cfg.tMax = doc["temperatura_max"];

  JsonArray arr = doc["horarios"].as<JsonArray>();

  if (arr.size() >= 3) {
    cfg.h1 = String((const char*)arr[0]);
    cfg.h2 = String((const char*)arr[1]);
    cfg.h3 = String((const char*)arr[2]);
  }
}

void syncTime() {
  configTime(0, 0, "pool.ntp.org", "time.google.com");

  for (int i = 0; i < 30; i++) {
    if (time(nullptr) > 1700000000) return;
    delay(200);
  }
}

float readTemperatureC() {
  sensors.requestTemperatures();
  float t = sensors.getTempCByIndex(0);

  if (t == DEVICE_DISCONNECTED_C)
    return NAN;

  return t;
}

// ===== SETUP =====

void setup() {
  Serial.begin(115200);

  pinMode(PIN_PORTA, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_PANICO, INPUT_PULLUP);

  digitalWrite(PIN_BUZZER, LOW);

  sensors.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);

  syncTime();
  fetchConfig();
}

// ===== LOOP =====

void loop() {
  unsigned long nowMs = millis();
  time_t nowSec = time(nullptr);

  // Atualiza config
  if (nowMs - lastConfigFetch > CONFIG_REFRESH_MS) {
    fetchConfig();
    lastConfigFetch = nowMs;
  }

  // ===== PORTA =====
  bool doorNow = (digitalRead(PIN_PORTA) == LOW);

  if (doorNow && !doorOpen) {
    doorOpen = true;
    doorOpenSince = nowSec;
    alarmePortaJaEnviado = false;
    sirenePorta = false;
    sendEvento("porta_aberta");
  }

  if (!doorNow && doorOpen) {
    doorOpen = false;
    int dur = (int)(nowSec - doorOpenSince);
    sendEvento("porta_fechada", dur);
    sirenePorta = false;
  }

  if (doorOpen && (nowSec - doorOpenSince) > 60) {
    sirenePorta = true;

    if (!alarmePortaJaEnviado) {
      int dur = (int)(nowSec - doorOpenSince);
      sendEvento("alarme_disparado", dur);
      alarmePortaJaEnviado = true;
    }
  }

  // ===== TEMPERATURA =====
  if (nowMs - lastRealtimeReading > REALTIME_READING_MS) {
    float t = readTemperatureC();

    if (!isnan(t)) {
      sendLeitura(t, "tempo_real");

      bool fora = (t < cfg.tMin || t > cfg.tMax);
      sireneTemperatura = fora;

      if (fora && !tempForaJaEnviado) {
        sendEvento("temperatura_fora_padrao");
        tempForaJaEnviado = true;
      }

      if (!fora) {
        tempForaJaEnviado = false;
      }
    }

    lastRealtimeReading = nowMs;
  }

  // ===== HORÁRIOS =====
  String hhmm = hhMmUtc();
  static String lastAuto = "";

  if ((hhmm == cfg.h1 || hhmm == cfg.h2 || hhmm == cfg.h3) && lastAuto != hhmm) {
    float t = readTemperatureC();
    if (!isnan(t)) sendLeitura(t, "automatico");
    lastAuto = hhmm;
  }

  // ===== PÂNICO =====
  int readBtn = digitalRead(PIN_PANICO);

  if (readBtn != lastPanicoState && (nowMs - lastDebounceMs) > 50) {
    lastDebounceMs = nowMs;
    lastPanicoState = readBtn;

    if (readBtn == LOW) {
      sirenePanico = !sirenePanico;

      if (sirenePanico) {
        sendEvento("botao_panico_ativado");
      } else {
        sendEvento("botao_panico_desativado");
      }
    }
  }

  // ===== SIRENE FINAL =====
  bool sireneFinal = sirenePanico || sirenePorta || sireneTemperatura;

  digitalWrite(PIN_BUZZER, sireneFinal ? HIGH : LOW);

  delay(10);
}
`;
}
