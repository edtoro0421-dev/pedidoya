'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase, cop, type Item, type Negocio, type Producto } from '../../lib/supabase'

type Modo = 'mesa' | 'linea'
type Enviado = { modo: Modo; total: number; waUrl?: string; mesa?: string }

function Menu() {
  const { slug } = useParams<{ slug: string }>()
  const sp = useSearchParams()
  const mesaQS = sp.get('mesa') ?? ''

  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [carga, setCarga] = useState<'cargando' | 'ok' | 'noexiste'>('cargando')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [modo, setModo] = useState<Modo>(mesaQS ? 'mesa' : 'linea')
  const [mesa, setMesa] = useState(mesaQS)
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState<Enviado | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: n } = await supabase.from('negocios').select('*').eq('slug', slug).maybeSingle()
      if (!n) return setCarga('noexiste')
      const { data: p } = await supabase
        .from('productos')
        .select('*')
        .eq('negocio_id', n.id)
        .eq('activo', true)
        .order('nombre')
      setNegocio(n as Negocio)
      setProductos((p ?? []) as Producto[])
      setCarga('ok')
    })()
  }, [slug])

  const items: Item[] = useMemo(
    () =>
      productos
        .filter((p) => (cart[p.id] ?? 0) > 0)
        .map((p) => ({ n: p.nombre, q: cart[p.id], p: p.precio })),
    [productos, cart]
  )
  const total = items.reduce((s, i) => s + i.q * i.p, 0)
  const color = negocio?.color ?? '#c2410c'

  const add = (id: string, d: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }))

  async function enviar() {
    if (!negocio || !items.length) return
    if (modo === 'mesa' && !mesa.trim()) return setError('Escribe el número de mesa.')
    if (modo === 'linea' && (!nombre.trim() || !direccion.trim()))
      return setError('Escribe tu nombre y tu dirección.')
    setError('')
    setEnviando(true)

    const { error: e } = await supabase.from('pedidos').insert({
      negocio_id: negocio.id,
      tipo: modo,
      mesa: modo === 'mesa' ? mesa.trim() : null,
      cliente: nombre.trim() || (modo === 'mesa' ? `Mesa ${mesa.trim()}` : ''),
      direccion: modo === 'linea' ? direccion.trim() : null,
      items,
      total,
    })
    setEnviando(false)
    if (e) return setError('No se pudo enviar el pedido. Intenta de nuevo.')

    let waUrl: string | undefined
    if (modo === 'linea') {
      const msg = [
        'Hola, quiero hacer un pedido:',
        ...items.map((i) => `• ${i.q} x ${i.n} (${cop(i.q * i.p)})`),
        `Total: ${cop(total)}`,
        `Nombre: ${nombre.trim()}`,
        `Dirección: ${direccion.trim()}`,
      ].join('\n')
      waUrl = `https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(msg)}`
      window.open(waUrl, '_blank')
    }
    setEnviado({ modo, total, waUrl, mesa: modo === 'mesa' ? mesa.trim() : undefined })
    setCart({})
  }

  if (carga === 'cargando') return <p className="p-6 text-neutral-500">Cargando menú…</p>
  if (carga === 'noexiste' || !negocio)
    return <p className="p-6">Este negocio no existe. Revisa el enlace o el QR.</p>

  if (enviado)
    return (
      <main className="mx-auto max-w-xl p-4">
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-900">
          <h2 className="text-xl font-bold">¡Pedido enviado!</h2>
          {enviado.modo === 'mesa' ? (
            <p className="mt-2 text-neutral-600">
              Mesa {enviado.mesa}: la cocina ya lo recibió. Total {cop(enviado.total)}.
            </p>
          ) : (
            <>
              <p className="mt-2 text-neutral-600">
                Falta un paso: envía el pedido por WhatsApp para que el negocio lo confirme.
              </p>
              <a
                href={enviado.waUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block rounded-xl bg-green-600 py-3 text-center font-semibold text-white"
              >
                Enviar por WhatsApp
              </a>
            </>
          )}
          <button
            onClick={() => setEnviado(null)}
            className="mt-3 w-full rounded-xl border border-neutral-300 py-3 font-medium"
          >
            Hacer otro pedido
          </button>
        </div>
      </main>
    )

  return (
    <main className="mx-auto max-w-xl px-4 pb-72 text-neutral-900">
      <header className="my-4 rounded-2xl p-5 text-white" style={{ background: color }}>
        <h1 className="text-2xl font-bold leading-tight">{negocio.nombre}</h1>
        <p className="opacity-90">Pide desde tu celular.</p>
      </header>

      <div className="mb-2 grid grid-cols-2 gap-2">
        {(['mesa', 'linea'] as Modo[]).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold"
            style={
              modo === m
                ? { background: color, color: '#fff', borderColor: color }
                : { borderColor: '#d4d4d4' }
            }
          >
            {m === 'mesa' ? 'Estoy en el restaurante' : 'Pedido a domicilio'}
          </button>
        ))}
      </div>

      <ul>
        {productos.map((p) => (
          <li key={p.id} className="flex items-center gap-3 border-b border-neutral-200 py-3">
            {p.imagen_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imagen_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
            )}
            <div className="flex-1">
              <b className="block">{p.nombre}</b>
              {p.descripcion && <small className="text-neutral-500">{p.descripcion}</small>}
              <div className="font-semibold">{cop(p.precio)}</div>
            </div>
            <div className="flex items-center gap-2">
              {(cart[p.id] ?? 0) > 0 && (
                <>
                  <button
                    onClick={() => add(p.id, -1)}
                    className="h-9 w-9 rounded-full border border-neutral-300"
                    aria-label={`Quitar ${p.nombre}`}
                  >
                    −
                  </button>
                  <span className="w-5 text-center">{cart[p.id]}</span>
                </>
              )}
              <button
                onClick={() => add(p.id, 1)}
                className="h-9 w-9 rounded-full text-white"
                style={{ background: color }}
                aria-label={`Agregar ${p.nombre}`}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto grid max-w-xl gap-2">
            {modo === 'mesa' ? (
              <>
                <input
                  value={mesa}
                  onChange={(e) => setMesa(e.target.value)}
                  inputMode="numeric"
                  placeholder="Número de mesa"
                  className="rounded-lg border border-neutral-300 p-3"
                />
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre (opcional)"
                  className="rounded-lg border border-neutral-300 p-3"
                />
              </>
            ) : (
              <>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="rounded-lg border border-neutral-300 p-3"
                />
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Dirección de entrega"
                  className="rounded-lg border border-neutral-300 p-3"
                />
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={enviar}
              disabled={enviando}
              className="rounded-xl bg-green-600 py-3 font-semibold text-white disabled:opacity-60"
            >
              {enviando
                ? 'Enviando…'
                : modo === 'mesa'
                  ? `Pedir · ${cop(total)}`
                  : `Pedir y enviar por WhatsApp · ${cop(total)}`}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-neutral-500">Cargando menú…</p>}>
      <Menu />
    </Suspense>
  )
}
