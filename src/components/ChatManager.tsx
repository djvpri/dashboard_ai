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

  // If active agent was closed, switch to first available
  if (!activeAgent) {
    return null // Parent handles fallback
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {agents.map((agent) => {
        const isActive = agent.id === activeId
        const isMounted = mountedAgents.has(agent.id)

        if (!isMounted && !isActive) return null

        return (
          <div
            key={agent.id}
            className={cn(
              'absolute inset-0 flex flex-col',
              isActive ? 'block z-10' : 'hidden z-0'
            )}
            style={{ 
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
              transition: 'opacity 150ms ease'
            }}
            role="tabpanel"
            aria-labelledby={`tab-${agent.id}`}
          >
            <ChatWindow key={agent.id} agent={agent} />
          </div>
        )
      })}

      {/* No active agent fallback */}
      {!activeAgent && (
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          <p>No active chat. Select an agent or create new.</p>
        </div>
      )}
    </div>
  )
}