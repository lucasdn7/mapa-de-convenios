-- 1. Ativar extensão PostGIS
create extension if not exists postgis;

-- 2. Tabela principal
create table obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  municipio text not null,
  regiao_turistica text,
  status text not null check (status in ('planejada', 'em_andamento', 'concluida', 'paralisada')),
  categoria text,
  tipo text not null default 'obra' check (tipo in ('obra', 'evento')),
  valor numeric,
  data_inicio date,
  data_previsao_fim date,
  data_vencimento_processo date,
  localizacao geography(Point, 4326) not null,
  created_at timestamptz default now()
);

-- 3. Índice espacial (essencial pra performance com consultas geográficas)
create index obras_localizacao_idx on obras using gist (localizacao);

-- 4. View que expõe latitude/longitude como colunas simples
--    (o frontend consome essa view em vez da tabela diretamente)
create or replace view obras_geo as
select
  id,
  nome,
  descricao,
  municipio,
  regiao_turistica,
  status,
  categoria,
  tipo,
  valor,
  data_inicio,
  data_previsao_fim,
  data_vencimento_processo,
  ST_Y(localizacao::geometry) as latitude,
  ST_X(localizacao::geometry) as longitude,
  created_at
from obras;

-- 5. Exemplo de insert
insert into obras (
  nome, municipio, regiao_turistica, status, categoria, tipo, valor,
  data_inicio, data_previsao_fim, data_vencimento_processo, localizacao
) values (
  'Reforma da Escola Municipal X',
  'Florianópolis',
  'Grande Florianópolis',
  'em_andamento',
  'Educação',
  'obra',
  850000,
  '2026-03-01',
  '2026-12-15',
  '2026-10-01',
  ST_SetSRID(ST_MakePoint(-48.5482, -27.5954), 4326) -- (longitude, latitude)
);

-- 6. Row Level Security (recomendado)
alter table obras enable row level security;

-- Leitura pública (o mapa é consultado sem login)
create policy "Leitura pública de obras"
  on obras for select
  using (true);

-- Ajuste a policy de escrita conforme sua necessidade de autenticação,
-- por exemplo restringindo a usuários autenticados:
-- create policy "Apenas usuários autenticados podem inserir"
--   on obras for insert
--   with check (auth.role() = 'authenticated');
