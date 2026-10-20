'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'

type Qr = { label: string; url: string; src: string }

export default function QrPage() {
  const { slug } = useParams<{ slug: string }>()
  const [mesas, setMesas] = useState(10)
  const [qrs, setQrs] = useState<Qr[]>([])

  useEffect(() => {
    const base = `${window.location.origin}/${slug}`
    const lista = [
      { label: 'Pedido a domicilio', url: base },
      ...Array.from({ length: mesas }, (_, i) => ({
        label: `Mesa ${i + 1}`,
        url: `${base}?mesa=${i + 1}`,
      })),
    ]
    let activo = true
    Promise.all(
      lista.map(async (q) => ({ ...q, src: await QRCode.toDataURL(q.url, { width: 360, margin: 1 }) }))
    ).then((r) => activo && setQrs(r))
    return () => {
      activo = false
    }
  }, [slug, mesas])

  return (
    <main className="mx-auto max-w-4xl p-4 text-neutral-900">
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <a href={`/admin/${slug}`} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          Volver al panel
        </a>
        <label className="flex items-center gap-2 text-sm">
          Número de mesas
          <input
            type="number"
            min={1}
            max={100}
            value={mesas}
            onChange={(e) => setMesas(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
            className="w-20 rounded-lg border border-neutral-300 p-2"
          />
        </label>
        <button onClick={() => window.print()} className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white">
          Imprimir
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {qrs.map((q) => (
          <figure key={q.label} className="break-inside-avoid rounded-xl border border-neutral-300 p-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.src} alt={`QR ${q.label}`} className="mx-auto w-full max-w-[220px]" />
            <figcaption className="mt-1 text-lg font-bold">{q.label}</figcaption>
            <small className="text-neutral-500">Escanea y pide desde tu celular</small>
          </figure>
        ))}
      </div>
    </main>
  )
}
