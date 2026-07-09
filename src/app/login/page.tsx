'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Login gagal')
        return
      }
      // Redirect ke halaman yang diminta sebelumnya (kalau ada), atau
      // langsung ke chat — jangan ke '/' supaya tidak ada landing page yang
      // muncul sebentar sebelum server redirect ke /chat berjalan.
      const params = new URLSearchParams(window.location.search)
      const target = params.get('redirect') || '/chat'
      router.push(target)
      router.refresh()
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-8 safe-area-inset-bottom safe-area-inset-top">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-zinc-800 space-y-6">
          <div className="text-center">
            <h1 className="text-4xl sm:text-3xl mb-1"><i className="bi bi-lock"></i></h1>
            <h2 className="text-xl sm:text-2xl font-semibold text-white">Z-Dashboard</h2>
            <p className="text-sm text-zinc-500 mt-1">Masukkan password</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
            className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-base placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white rounded-xl py-3 text-base font-medium transition-colors"
          >
            {loading ? '...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
