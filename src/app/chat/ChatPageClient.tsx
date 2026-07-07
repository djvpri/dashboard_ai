'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ChatTabs from '@/components/ChatTabs'
import ChatManager from '@/components/ChatManager'
import NewAgentModal from '@/components/NewAgentModal'
import { Agent, agents as agentsBawaan, customAgentKeAgent } from '@/lib/agents'
import { UnreadProvider } from '@/lib/unread'

interface Props {
  initialAgent: Agent
  agents: Agent[]
  initialAgentId?: string  // ID yang diminta dari URL — bisa agent kustom yang belum ada di initialAgents
}

export default function ChatPageClient({ initialAgent, agents: initialAgents, initialAgentId }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Mulai dari initialAgent.id, tapi nanti dikoreksi ke initialAgentId
  // setelah agent kustom selesai diload dari DB (lihat useEffect di bawah)
  const [activeId, setActiveId] = useState<string>(initialAgentId || initialAgent.id)
  const [allAgents, setAllAgents] = useState<Agent[]>(initialAgents)
  const [showNewModal, setShowNewModal] = useState(false)
  // Agent yang sedang di-edit (null = tidak ada)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)

  // Load agent kustom dari DB saat pertama mount
  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        if (data.agents?.length > 0) {
          const kustom: Agent[] = data.agents.map((a: {
            id: string; name: string; emoji: string
            description: string; backend: string; systemPrompt: string
          }) => customAgentKeAgent(a))
          const semuaAgent = [...agentsBawaan, ...kustom]
          setAllAgents(semuaAgent)
          // Kalau URL mengarah ke agent kustom (tidak ada di agent bawaan),
          // aktifkan setelah agent kustom selesai diload dari DB
          if (initialAgentId && !agentsBawaan.find(a => a.id === initialAgentId)) {
            const agentKustom = kustom.find(a => a.id === initialAgentId)
            if (agentKustom) setActiveId(initialAgentId)
          }
        }
      })
      .catch(() => {})
  }, [initialAgentId])

  // Sync dengan URL
  useEffect(() => {
    const urlAgentId = searchParams.get('agent')
    if (urlAgentId && urlAgentId !== activeId && allAgents.some(a => a.id === urlAgentId)) {
      setActiveId(urlAgentId)
    }
  }, [searchParams, allAgents, activeId])

  const switchAgent = (id: string) => {
    if (id === 'new') {
      setShowNewModal(true)
      return
    }
    setActiveId(id)
    router.push(`/chat?agent=${id}`)
  }

  const closeTab = (id: string) => {
    // Agent bawaan tidak bisa ditutup (hanya dikurangi dari tab jika ada tab kustom)
    const idx = allAgents.findIndex(a => a.id === id)
    if (idx === -1) return
    const remaining = allAgents.filter(a => a.id !== id)
    setAllAgents(remaining)
    if (activeId === id) {
      const nextId = remaining[0]?.id || agentsBawaan[0].id
      setActiveId(nextId)
      router.push(`/chat?agent=${nextId}`)
    }
  }

  // Dipanggil setelah agent baru/editan tersimpan
  const handleAgentSaved = (agent: Agent) => {
    setAllAgents(prev => {
      const sudahAda = prev.findIndex(a => a.id === agent.id)
      if (sudahAda >= 0) {
        // Update agent yang sudah ada
        return prev.map(a => a.id === agent.id ? agent : a)
      }
      return [...prev, agent]
    })
    setActiveId(agent.id)
    router.push(`/chat?agent=${agent.id}`)
  }

  // Dipanggil setelah agent kustom dihapus
  const handleAgentDeleted = (id: string) => {
    setAllAgents(prev => prev.filter(a => a.id !== id))
    if (activeId === id) {
      const nextId = agentsBawaan[0].id
      setActiveId(nextId)
      router.push(`/chat?agent=${nextId}`)
    }
  }

  return (
    <UnreadProvider activeId={activeId}>
    <div className="flex h-screen">
      <Sidebar
        activeId={activeId}
        onSwitchAgent={switchAgent}
        agents={allAgents}
        onEditAgent={(agent) => setEditAgent(agent)}
      />
      <div className="flex-1 flex flex-col">
        <ChatTabs
          agents={allAgents}
          activeId={activeId}
          onSwitch={switchAgent}
        />
        <ChatManager agents={allAgents} activeId={activeId} onCloseTab={closeTab} />
      </div>

      {/* Modal buat agent baru */}
      {showNewModal && (
        <NewAgentModal
          onSave={handleAgentSaved}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {/* Modal edit agent kustom */}
      {editAgent?.isCustom && (
        <NewAgentModal
          initialData={{
            id: editAgent.id,
            name: editAgent.name,
            emoji: editAgent.emoji,
            description: editAgent.description,
            backend: editAgent.backend || 'openclaw',
            systemPrompt: editAgent.systemPrompt,
          }}
          onSave={handleAgentSaved}
          onDelete={handleAgentDeleted}
          onClose={() => setEditAgent(null)}
        />
      )}
    </div>
    </UnreadProvider>
  )
}
