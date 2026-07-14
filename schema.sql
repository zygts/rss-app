-- Ejecuta esto en el SQL Editor de Neon (Project > SQL Editor), o con
-- cualquier cliente Postgres (psql, TablePlus, etc.) conectado a tu base

create table if not exists fuentes (
  id bigint generated always as identity primary key,
  nombre text not null,
  url_feed text not null unique,
  ultima_comprobacion timestamptz,
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

create table if not exists posts (
  id bigint generated always as identity primary key,
  fuente_id bigint not null references fuentes(id) on delete cascade,
  titulo text not null,
  url text not null,
  fecha_publicacion timestamptz,
  resumen text,
  leido boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (fuente_id, url)
);

create index if not exists posts_fecha_idx on posts (fecha_publicacion desc);
create index if not exists posts_fuente_idx on posts (fuente_id);

-- Fuentes de ejemplo (bórralas o edítalas desde el propio panel una vez montado)
insert into fuentes (nombre, url_feed) values
  ('Ejemplo blog', 'https://ejemplo.com/feed/')
on conflict (url_feed) do nothing;
