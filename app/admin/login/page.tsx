'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err || !data.user) {
      setCargando(false)
      return setError('Correo o contraseña incorrectos.')
    }
    const { data: n } = await supabase
      .from('negocios')
      .select('slug')
      .eq('owner_id', data.user.id)
      .limit(1)
      .maybeSingle()
    setCargando(false)
    if (!n) return setError('Tu usuario todavía no tiene un negocio asignado.')
    router.replace(`/admin/${n.slug}`)
  }

  return (
    <main className="mx-auto max-w-sm p-6 text-neutral-900">
      <h1 className="mb-4 mt-10 text-2xl font-bold">Panel del negocio</h1>
      <form onSubmit={entrar} className="grid gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          autoComplete="email"
          className="rounded-lg border border-neutral-300 p-3"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoComplete="current-password"
          className="rounded-lg border border-neutral-300 p-3"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={cargando}
          className="rounded-xl bg-neutral-900 py-3 font-semibold text-white disabled:opacity-60"
        >
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
