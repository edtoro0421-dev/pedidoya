import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Negocio = {
  id: string
  slug: string
  nombre: string
  whatsapp: string
  color: string
  owner_id: string | null
}

export type Producto = {
  id: string
  negocio_id: string
  nombre: string
  descripcion: string | null
  precio: number
  imagen_url: string | null
  activo: boolean
}

export type Item = { n: string; q: number; p: number }

export type Pedido = {
  id: string
  negocio_id: string
  tipo: 'mesa' | 'linea'
  mesa: string | null
  cliente: string
  direccion: string | null
  items: Item[]
  total: number
  estado: 'nuevo' | 'preparando' | 'entregado'
  created_at: string
}

export const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
