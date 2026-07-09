'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Agent } from '@/lib/agents'
import { useSemuaAgentTampil } from '@/lib/agent-custom'
import AgentEditModal from './AgentEditModal'
import { useUnread } from '@/lib/unread'

interface SidebarProps {
  activeId: string
  onSwitchAgent: (id: string) => void
  agents: Agent[]
  onEditAgent?: (agent: Agent) => void
}

export default function Sidebar({ activeId, onSwitchAgent, agents, onEditAgent }: SidebarProps) {
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const { unread } = useUnread()

  // Resizable sidebar
  const MIN_WIDTH = 180
  const MAX_WIDTH = 400
  const DEFAULT_WIDTH = 256 // w-64
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH
    const saved = localStorage.getItem('zd_sidebar_width')
    return saved ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parseInt(saved))) : DEFAULT_WIDTH
  })
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    const delta = e.clientX - startX.current
    const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
    setWidth(newW)
  }, [])

  const onMouseUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    setWidth(w => {
      localStorage.setItem('zd_sidebar_width', String(w))
      return w
    })
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }
  // Kustomisasi tampilan (nama/emoji) dari server — diterapkan ke agent bawaan
  const agentsTampil = useSemuaAgentTampil()
  const tampilMap = Object.fromEntries(agentsTampil.map(a => [a.id, a]))

  return (
    <>
      {/* Mobile hamburger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white shadow-lg"
          aria-label="Buka sidebar"
        >
          <i className="bi bi-list text-xl"></i>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <aside
        style={{ width: `${width}px` }}
        className={`fixed inset-y-0 left-0 z-50 bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >

        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <i className="bi bi-robot text-xl"></i>
            <span className="font-semibold text-white">Z-Dashboard</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800" aria-label="Tutup sidebar"><i className="bi bi-x"></i></button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {agents.map((agent) => {
            // Pakai tampilan yang sudah di-kustomisasi kalau ada (hanya untuk agent bawaan)
            const tampil = agent.isCustom ? agent : (tampilMap[agent.id] ?? agent)
            const isActive = activeId === agent.id
            return (
              <div key={agent.id} className="relative group">
                <button
                  onClick={() => { onSwitchAgent(agent.id); setOpen(false) }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${isActive ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                >
                  <span className="text-lg">{tampil.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{tampil.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{tampil.description}</div>
                  </div>
                  {/* Dot unread */}
                  {unread[agent.id] > 0 && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
                  )}
                  {/* Badge kustom */}
                  {agent.isCustom && (
                    <span className="text-[9px] bg-violet-500/20 text-violet-400 rounded px-1 shrink-0">kustom</span>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation()
                    if (agent.isCustom && onEditAgent) {
                      onEditAgent(agent) // buka NewAgentModal (edit + hapus)
                    } else {
                      setEditId(agent.id) // buka AgentEditModal (override nama/emoji/prompt)
                    }
                  }}
                  title={`Edit ${tampil.name}`}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity lg:opacity-100"
                >
                  <i className="bi bi-pencil"></i>
                </button>
              </div>
            )
          })}

          {/* Tombol tambah agent */}
          <button
            onClick={() => { onSwitchAgent('new'); setOpen(false) }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors border border-dashed border-zinc-700 hover:border-zinc-500 mt-2"
          >
            <i className="bi bi-plus-lg text-lg"></i>
            <span className="text-sm font-medium">Tambah agent baru</span>
          </button>
        </nav>

        {editId && <AgentEditModal agentId={editId} onClose={() => setEditId(null)} />}

        {/* Drag handle — hanya di desktop (lg+) */}
        <div
          onMouseDown={startDrag}
          className="hidden lg:flex absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize group items-center justify-center z-10"
          title="Geser untuk ubah lebar sidebar"
        >
          <div className="w-0.5 h-12 rounded-full bg-zinc-700 group-hover:bg-indigo-500 transition-colors duration-150" />
        </div>
      </aside>
    </>
  )
}
