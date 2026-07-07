'use client'

import { useState, useEffect, useMemo } from 'react'
import { Agent } from '@/lib/agents'
import ChatWindow from '@/components/ChatWindow'

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

interface ChatManagerProps {
  agents: Agent[]
  activeId: string
  onCloseTab?: (id: string) => void
}

export default function ChatManager({ agents, activeId, onCloseTab }: ChatManagerProps) {
  const [mountedAgents, setMountedAgents] = useState<Set<string>>(new Set())

  // Mount active agent immediately, others on demand
  useEffect(() => {
    setMountedAgents(prev => new Set(prev).add(activeId))
  }, [activeId])

  const activeAgent = useMemo(() => agents.find(a => a.id === activeId), [agents, activeId])

  if (!activeAgent) {
    return null
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {agents.map((agent) => {
        const isActive = agent.id === activeId
        const isMounted = mountedAgents.has(agent.id)

        if (!isMounted && !isActive) return null

        return (
          <div
            key={agent.id}
            className={cn(
              'flex-1 flex flex-col min-h-0',
              isActive ? 'flex' : 'hidden'
            )}
            role="tabpanel"
            aria-labelledby={`tab-${agent.id}`}
          >
            <ChatWindow key={agent.id} agent={agent} />
          </div>
        )
      })}
    </div>
  )
}