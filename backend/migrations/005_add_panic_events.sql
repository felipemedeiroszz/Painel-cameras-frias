alter table eventos drop constraint if exists eventos_tipo_evento_check;
alter table eventos add constraint eventos_tipo_evento_check
  check (tipo_evento in (
    'porta_aberta',
    'porta_fechada',
    'alarme_disparado',
    'temperatura_fora_padrao',
    'botao_panico_ativado',
    'botao_panico_desativado'
  ));

