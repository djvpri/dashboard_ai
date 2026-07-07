'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ChatTabs from '@/components/ChatTabs'
import ChatManager from '@/components/ChatManager'
import { Agent, agents } from '@/lib/agents'

export default function ChatPageClient({ initialAgent, agents: initialAgents }: { initialAgent: Agent; agents: Agent[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeId, setActiveId] = useState<string>(initialAgent.id)
  const [localAgents, setLocalAgents] = useState<Agent[]>(initialAgents)

  // Sync with URL on mount and searchParams changes
  useEffect(() => {
    const urlAgentId = searchParams.get('agent')
    if (urlAgentId && urlAgentId !== activeId && localAgents.some(a => a.id === urlAgentId)) {
      setActiveId(urlAgentId)
    }
  }, [searchParams, localAgents, activeId])

  const switchAgent = (id: string) => {
    if (id === 'new') {
      // TODO: Create new custom agent
      return
    }
    setActiveId(id)
    router.push(`/chat?agent=${id}`)
  }

  const closeTab = (id: string) => {
    const idx = localAgents.findIndex(a => a.id === id)
    if (idx === -1) return
    const nextAgents = localAgents.filter(a => a.id !== id)
    setLocalAgents(nextAgents)
    if (activeId === id) {
      const nextId = nextAgents[0]?.id || agents[0].id
      setActiveId(nextId)
      router.push(`/chat?agent=${nextId}`)
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar activeId={activeId} onSwitchAgent={switchAgent} agents={localAgents} />
      <div className="flex-1 flex flex-col">
        <ChatTabs agents={localAgents} activeId={activeId} onSwitch={switchAgent} onClose={closeTab} closable={localAgents.length > 1} />
        <ChatManager agents={localAgents} activeId={activeId} onCloseTab={closeTab} />
      </div>
    </div>
  )
}