'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, cop, type Negocio, type Pedido, type Producto } from '../../../lib/supabase'

const SIGUIENTE: Record<Pedido['estado'], Pedido['estado'] | null> = {
  nuevo: 'preparando',
  preparando: 'entregado',
  entregado: null,
}
const ACCION: Record<Pedido['estado'], string> = {
  nuevo: 'Empezar a preparar',
  preparando: 'Marcar entregado',
  entregado: '',
}

export default function Admin() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [carga, setCarga] = useState<'cargando' | 'ok' | 'noexiste' | 'sinacceso'>('cargando')
  const [sonido, setSonido] = useState(false)
  const sonidoRef = useRef(false)
  const audioRef = useRef<AudioContext | null>(null)

  const beep = useCallback(() => {
    if (!sonidoRef.current || !audioRef.current) return
    const c = audioRef.current
    const o = c.createOscillator()
    const g = c.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.2, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
    o.connect(g).connect(c.destination)
    o.start()
    o.stop(c.currentTime + 0.5)
  }, [])

  function activarSonido() {
    audioRef.current = new AudioContext()
    sonidoRef.current = true
    setSonido(true)
    beep()
  }

  async function salir() {
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  useEffect(() => {
    let canal: ReturnType<typeof supabase.channel> | null = null
    let activo = true
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return router.replace('/admin/login')

      const { data: n } = await supabase.from('negocios').select('*').eq('slug', slug).maybeSingle()
      if (!activo) return
      if (!n) return setCarga('noexiste')
      if (n.owner_id !== session.user.id) return setCarga('sinacceso')
      setNegocio(n as Negocio)

      const [{ data: ped }, { data: prod }] = await Promise.all([
        supabase
          .from('pedidos')
          .select('*')
          .eq('negocio_id', n.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('productos').select('*').eq('negocio_id', n.id).order('nombre'),
      ])
      if (!activo) return
      setPedidos((ped ?? []) as Pedido[])
      setProductos((prod ?? []) as Producto[])
      setCarga('ok')

      canal = supabase
        .channel(`pedidos-${n.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `negocio_id=eq.${n.id}` },
          (payload) => {
            setPedidos((p) => [payload.new as Pedido, ...p])
            beep()
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `negocio_id=eq.${n.id}` },
          (payload) =>
            setPedidos((p) => p.map((x) => (x.id === payload.new.id ? (payload.new as Pedido) : x)))
        )
        .subscribe()
    })()
    return () => {
      activo = false
      if (canal) supabase.removeChannel(canal)
    }
  }, [slug, beep, router])

  async function avanzar(p: Pedido) {
    const sig = SIGUIENTE[p.estado]
    if (!sig) return
    setPedidos((l) => l.map((x) => (x.id === p.id ? { ...x, estado: sig } : x)))
    await supabase.from('pedidos').update({ estado: sig }).eq('id', p.id)
  }

  async function precio(id: string, valor: string) {
    const v = Math.max(0, Number(valor) || 0)
    setProductos((l) => l.map((x) => (x.id === id ? { ...x, precio: v } : x)))
    await supabase.from('productos').update({ precio: v }).eq('id', id)
  }

  async function disponible(id: string, v: boolean) {
    setProductos((l) => l.map((x) => (x.id === id ? { ...x, activo: v } : x)))
    await supabase.from('productos').update({ activo: v }).eq('id', id)
  }

  if (carga === 'cargando') return <p className="p-6 text-neutral-500">Cargando panel…</p>
  if (carga === 'noexiste') return <p className="p-6">Negocio no encontrado.</p>
  if (carga === 'sinacceso' || !negocio)
    return (
      <p className="p-6">
        Esta cuenta no tiene acceso a este negocio.{' '}
        <button onClick={salir} className="underline">
          Cambiar de cuenta
        </button>
      </p>
    )

  const nuevos = pedidos.filter((p) => p.estado === 'nuevo').length

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 text-neutral-900">
      <div className="my-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {negocio.nombre}
          {nuevos > 0 && (
            <span className="ml-2 rounded-full bg-orange-600 px-2 py-0.5 text-sm text-white">
              {nuevos} nuevo{nuevos > 1 ? 's' : ''}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          {sonido ? (
            <span className="text-sm text-neutral-500">Sonido activado</span>
          ) : (
            <button onClick={activarSonido} className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white">
              Activar sonido
            </button>
          )}
          <a href={`/admin/${slug}/qr`} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            Códigos QR
          </a>
          <button onClick={salir} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            Salir
          </button>
        </div>
      </div>

      {pedidos.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-neutral-500">
          Aún no hay pedidos. Aparecerán aquí en cuanto un cliente envíe uno.
        </p>
      )}

      {pedidos.map((p) => (
        <article
          key={p.id}
          className={`mb-3 rounded-xl border p-4 ${
            p.estado === 'nuevo' ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <b>
                {p.tipo === 'mesa' ? `Mesa ${p.mesa}` : 'Domicilio'} · {p.cliente}
              </b>
              {p.tipo === 'linea' && <div className="text-sm text-neutral-600">{p.direccion}</div>}
              <div className="text-xs text-neutral-500">
                {new Date(p.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <span className="font-semibold capitalize">{p.estado}</span>
          </div>
          <ul className="my-2 list-disc pl-5 text-sm">
            {p.items.map((i, k) => (
              <li key={k}>
                {i.q} x {i.n}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <b>{cop(p.total)}</b>
            {SIGUIENTE[p.estado] && (
              <button onClick={() => avanzar(p)} className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white">
                {ACCION[p.estado]}
              </button>
            )}
          </div>
        </article>
      ))}

      <h2 className="mb-2 mt-8 text-lg font-bold">Menú y precios</h2>
      {productos.map((p) => (
        <div key={p.id} className="flex items-center gap-3 border-b border-neutral-200 py-2">
          <span className="flex-1">{p.nombre}</span>
          <input
            type="number"
            defaultValue={p.precio}
            onBlur={(e) => precio(p.id, e.target.value)}
            className="w-28 rounded-lg border border-neutral-300 p-2 text-right"
            aria-label={`Precio de ${p.nombre}`}
          />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={p.activo} onChange={(e) => disponible(p.id, e.target.checked)} />
            Disponible
          </label>
        </div>
      ))}
    </main>
  )
}
