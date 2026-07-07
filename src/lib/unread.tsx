'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

interface UnreadCtx {
  unread: Record<string, number>   // agentId -> jumlah pesan belum dibaca
  tambah: (agentId: string) => void
  bersihkan: (agentId: string) => void
}

const Ctx = createContext<UnreadCtx>({
  unread: {},
  tambah: () => {},
  bersihkan: () => {},
})

export function UnreadProvider({ children, activeId }: { children: React.ReactNode; activeId: string }) {
  const [unread, setUnread] = useState<Record<string, number>>({})
  const activeRef = useRef(activeId)
  activeRef.current = activeId

  const tambah = useCallback((agentId: string) => {
    // Jangan tambah kalau agent ini sedang aktif/dilihat
    if (agentId === activeRef.current) return
    setUnread(prev => ({ ...prev, [agentId]: (prev[agentId] || 0) + 1 }))
  }, [])

  const bersihkan = useCallback((agentId: string) => {
    setUnread(prev => {
      if (!prev[agentId]) return prev
      const next = { ...prev }
      delete next[agentId]
      return next
    })
  }, [])

  // Update title browser
  useEffect(() => {
    const total = Object.values(unread).reduce((s, n) => s + n, 0)
    document.title = total > 0 ? `(${total}) Z-Dashboard` : 'Z-Dashboard'
    return () => { document.title = 'Z-Dashboard' }
  }, [unread])

  // Bersihkan notif agent yang aktif saat ini otomatis
  useEffect(() => {
    bersihkan(activeId)
  }, [activeId, bersihkan])

  return <Ctx.Provider value={{ unread, tambah, bersihkan }}>{children}</Ctx.Provider>
}

export function useUnread() {
  return useContext(Ctx)
}
