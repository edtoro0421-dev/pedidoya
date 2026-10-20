-- PASO 1. Pega TODO esto en Supabase > SQL Editor > Run. Se corre una sola vez.

create table negocios (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nombre text not null,
  whatsapp text not null,           -- solo números con indicativo: 573001234567
  color text not null default '#c2410c',
  owner_id uuid references auth.users(id)
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  descripcion text,
  precio integer not null check (precio >= 0),
  imagen_url text,
  activo boolean not null default true
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  tipo text not null check (tipo in ('mesa', 'linea')),
  mesa text,
  cliente text not null,
  direccion text,
  items jsonb not null,
  total integer not null check (total >= 0),
  estado text not null default 'nuevo' check (estado in ('nuevo', 'preparando', 'entregado')),
  created_at timestamptz not null default now(),
  constraint pedidos_destino_check check (
    (tipo = 'mesa'  and mesa is not null and length(trim(mesa)) > 0) or
    (tipo = 'linea' and direccion is not null and length(trim(direccion)) > 0)
  )
);

-- Tiempo real para el panel
alter table pedidos replica identity full;
alter publication supabase_realtime add table pedidos;

-- Seguridad: cada dueño solo ve y edita lo suyo
alter table negocios  enable row level security;
alter table productos enable row level security;
alter table pedidos   enable row level security;

-- Cualquiera puede ver el negocio y el menú activo (para el QR)
create policy "ver negocios" on negocios for select using (true);
create policy "ver menu activo" on productos for select using (activo = true);

-- El dueño ve todos sus productos y puede editarlos
create policy "dueno ve productos" on productos for select to authenticated
  using (exists (select 1 from negocios n where n.id = negocio_id and n.owner_id = auth.uid()));
create policy "dueno edita productos" on productos for update to authenticated
  using (exists (select 1 from negocios n where n.id = negocio_id and n.owner_id = auth.uid()));

-- Cualquier cliente puede crear un pedido en un negocio que exista
create policy "crear pedidos" on pedidos for insert
  with check (exists (select 1 from negocios n where n.id = negocio_id));

-- Solo el dueño ve y actualiza los pedidos de su negocio
create policy "dueno ve pedidos" on pedidos for select to authenticated
  using (exists (select 1 from negocios n where n.id = negocio_id and n.owner_id = auth.uid()));
create policy "dueno actualiza pedidos" on pedidos for update to authenticated
  using (exists (select 1 from negocios n where n.id = negocio_id and n.owner_id = auth.uid()));
