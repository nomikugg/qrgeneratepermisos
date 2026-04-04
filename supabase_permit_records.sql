-- Tabla para buscar permisos por placa
create table if not exists public.permit_records (
  id bigint generated always as identity primary key,
  placa text not null,
  placa_normalized text not null,
  job_id uuid not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_permit_records_placa_normalized
  on public.permit_records (placa_normalized);

create index if not exists idx_permit_records_created_at
  on public.permit_records (created_at desc);

-- Seguridad: el backend usa service role key, por eso negamos acceso anon.
alter table public.permit_records enable row level security;

-- Puedes crear policies despues si quieres exponer lectura desde cliente.
