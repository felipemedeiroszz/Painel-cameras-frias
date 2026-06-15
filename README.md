# Monitoramento de Câmaras Frias (Multi-loja)

Aplicação web completa (frontend + backend) para monitoramento IoT de câmaras frias com múltiplas lojas, dispositivos (ESP32/ESP32-CAM), leituras, eventos, resumo diário, alertas e stream de câmera.

## Requisitos

- Node.js 20+ (testado com Node 24)
- PostgreSQL 13+

## Como rodar (desenvolvimento)

### 1) Banco de dados

1. Crie um banco no Postgres:

- Nome sugerido: `sensor`

2. Configure a URL do banco no backend:

- Copie [backend/.env.example](file:///c:/Users/Felipe/Desktop/sensor/backend/.env.example) para `backend/.env`
- Ajuste `DATABASE_URL` e `JWT_SECRET`

### 2) Backend (API + WebSocket)

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- API: `http://localhost:3001`
- Healthcheck: `GET http://localhost:3001/health`

Login (mock):

- e-mail: `admin@sensor.local`
- senha: `admin123`

### 3) Frontend (Dashboard)

```bash
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`

Se quiser mudar o endpoint da API:

- Copie [frontend/.env.example](file:///c:/Users/Felipe/Desktop/sensor/frontend/.env.example) para `frontend/.env`
- Ajuste `VITE_API_URL`

## Migrations e dados mockados

- Migrations SQL: [backend/migrations](file:///c:/Users/Felipe/Desktop/sensor/backend/migrations)
- Runner de migrations: `npm run db:migrate` ([migrate.ts](file:///c:/Users/Felipe/Desktop/sensor/backend/src/scripts/migrate.ts))
- Seed adicional de leituras/resumos (hoje): `npm run db:seed` ([seed.ts](file:///c:/Users/Felipe/Desktop/sensor/backend/src/scripts/seed.ts))

## Integração com ESP32

### Buscar configuração do dispositivo

```http
GET /api/dispositivos/1/config
```

Resposta:

```json
{
  "temperatura_min": -20,
  "temperatura_max": -15,
  "horarios": ["07:00", "15:00", "22:00"]
}
```

### Enviar leitura

```http
POST /api/leituras
Content-Type: application/json

{
  "dispositivo_id": 1,
  "temperatura": -18.5,
  "tipo_registro": "automatico"
}
```

### Enviar eventos

```http
POST /api/eventos
Content-Type: application/json

{
  "dispositivo_id": 1,
  "tipo_evento": "porta_aberta"
}
```

```http
POST /api/eventos
Content-Type: application/json

{
  "dispositivo_id": 1,
  "tipo_evento": "porta_fechada"
}
```

### Segurança opcional nas rotas de ingestão

Se você definir `DEVICE_INGEST_TOKEN` no `backend/.env`, as rotas de ingestão exigem o header:

- `x-device-token: <seu_token>`

## Estrutura do projeto

- Backend: [backend](file:///c:/Users/Felipe/Desktop/sensor/backend)
- Frontend: [frontend](file:///c:/Users/Felipe/Desktop/sensor/frontend)

