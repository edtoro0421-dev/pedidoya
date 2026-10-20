-- PASO 2. Se corre una vez por cada negocio cliente.
-- Antes: Supabase > Authentication > Users > Add user (correo + contraseña del dueño,
-- marcando "Auto Confirm User"). Luego cambia los datos de abajo y dale Run.

with n as (
  insert into negocios (slug, nombre, whatsapp, color, owner_id)
  values (
    'el-ejemplo',                         -- sale en la URL: tudominio.com/el-ejemplo
    'Hamburguesas El Ejemplo',            -- nombre del negocio
    '573001375963',                       -- WhatsApp con indicativo, solo números
    '#c2410c',                            -- color de marca
    (select id from auth.users where email = 'dueno@correo.com')  -- correo del dueño
  )
  returning id
)
insert into productos (negocio_id, nombre, descripcion, precio)
select n.id, p.nombre, p.descripcion, p.precio from n, (values
  ('Hamburguesa sencilla', 'Carne, queso, lechuga, tomate y salsas', 16000),
  ('Hamburguesa doble', 'Doble carne, doble queso y tocineta', 22000),
  ('Perro caliente', 'Con papa ripio, queso y salsas', 12000),
  ('Salchipapa', 'Papa, salchicha, queso y salsas', 14000),
  ('Papas a la francesa', 'Porción grande', 8000),
  ('Gaseosa 400 ml', null, 4000)
) as p(nombre, descripcion, precio);
