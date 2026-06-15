alter table users add column if not exists loja_id integer null references lojas(id) on delete cascade;
alter table users add column if not exists is_admin boolean not null default false;

create unique index if not exists users_loja_unique
  on users (loja_id)
  where loja_id is not null and is_admin = false;

update users set is_admin = true where email = 'admin@sensor.local';

insert into users (email, password_hash, loja_id, is_admin) values
  ('loja1@sensor.local', '$2b$10$12yqR1gpXTiwGn7Eu3o0FO8XTFiFbbLqMEP9pvUd3SpMGQrDlaN2m', 1, false),
  ('loja2@sensor.local', '$2b$10$12yqR1gpXTiwGn7Eu3o0FO8XTFiFbbLqMEP9pvUd3SpMGQrDlaN2m', 2, false)
on conflict (email) do nothing;

