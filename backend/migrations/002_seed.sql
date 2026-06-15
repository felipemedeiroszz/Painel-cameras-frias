insert into setores (id, nome) values
  (1, 'Açougue'),
  (2, 'Hortifruti'),
  (3, 'Laticínios')
on conflict (id) do nothing;

insert into tipos_camera (id, nome) values
  (1, 'Resfriada'),
  (2, 'Congelada')
on conflict (id) do nothing;

insert into lojas (id, nome, cidade, estado) values
  (1, 'Loja Centro', 'São Paulo', 'SP'),
  (2, 'Loja Norte', 'Campinas', 'SP')
on conflict (id) do nothing;

insert into dispositivos (
  id,
  nome,
  loja_id,
  setor_id,
  tipo_camera_id,
  ip_camera,
  status,
  temperatura_min,
  temperatura_max,
  horario_1,
  horario_2,
  horario_3,
  porta_status
) values
  (1, 'Câmara 01', 1, 1, 2, '192.168.0.50', 'offline', -20, -15, '07:00', '15:00', '22:00', 'fechada'),
  (2, 'Freezer Fundo', 1, 3, 2, null, 'offline', -18, -12, '07:00', '15:00', '22:00', 'fechada'),
  (3, 'Câmara Resfriada', 2, 2, 1, '192.168.0.51', 'offline', 0, 5, '07:00', '15:00', '22:00', 'fechada')
on conflict (id) do nothing;

insert into users (id, email, password_hash) values
  (1, 'admin@sensor.local', '$2b$10$12yqR1gpXTiwGn7Eu3o0FO8XTFiFbbLqMEP9pvUd3SpMGQrDlaN2m')
on conflict (id) do nothing;

