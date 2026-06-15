export type Loja = {
  id: number;
  nome: string;
  cidade: string;
  estado: string;
  login_email?: string | null;
};

export type Setor = {
  id: number;
  nome: string;
};

export type TipoCamera = {
  id: number;
  nome: string;
};

export type Dispositivo = {
  id: number;
  nome: string;
  loja_id: number;
  setor_id: number;
  tipo_camera_id: number;
  ip_camera: string | null;
  status: "online" | "offline";
  temperatura_atual: number | null;
  ultima_leitura_at: string | null;
  porta_status: "aberta" | "fechada" | null;
  last_seen: string | null;
  loja_nome: string;
  setor_nome: string;
  tipo_camera_nome: string;
};

export type Leitura = {
  id: number;
  dispositivo_id: number;
  temperatura: number;
  data_hora: string;
  tipo_registro: "automatico" | "tempo_real";
  dispositivo_nome: string;
};

export type Evento = {
  id: number;
  dispositivo_id: number;
  tipo_evento:
    | "porta_aberta"
    | "porta_fechada"
    | "alarme_disparado"
    | "temperatura_fora_padrao"
    | "botao_panico_ativado"
    | "botao_panico_desativado";
  data_hora: string;
  duracao_segundos: number | null;
  dispositivo_nome: string;
};

export type ResumoDiario = {
  id: number;
  dispositivo_id: number;
  data: string;
  total_aberturas: number;
  tempo_total_aberto: number;
  total_alarmes: number;
  dispositivo_nome: string;
};

export type DeviceConfig = {
  temperatura_min: number | null;
  temperatura_max: number | null;
  horarios: string[];
};

export type DashboardCards = {
  dispositivo_id: number;
  temperatura_atual: number | null;
  ultima_leitura_at: string | null;
  porta_status: "aberta" | "fechada" | null;
  tempo_aberto_hoje_segundos: number;
  total_aberturas_hoje: number;
  total_alarmes_hoje: number;
};
