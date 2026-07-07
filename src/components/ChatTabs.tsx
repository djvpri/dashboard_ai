'use client'

import { useState, useRef, useEffect } from 'react'
import { Agent } from '@/lib/agents'
import { useUnread } from '@/lib/unread'

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

interface ChatTabsProps {
  agents: Agent[]
  activeId: string
  onSwitch: (id: string) => void
}

export default function ChatTabs({ agents, activeId, onSwitch }: ChatTabsProps) {
  const tabsRef = useRef<HTMLDivElement>(null)
  const [scrollPos, setScrollPos] = useState(0)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)
  const { unread } = useUnread()

  const scrollLeft = () => {
    tabsRef.current?.scrollBy({ left: -200, behavior: 'smooth' })
  }
  const scrollRight = () => {
    tabsRef.current?.scrollBy({ left: 200, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    const check = () => {
      setShowLeftFade(el.scrollLeft > 8)
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
    }
    check()
    el.addEventListener('scroll', check)
    return () => el.removeEventListener('scroll', check)
  }, [])

  // Scroll active tab into view
  useEffect(() => {
    const el = tabsRef.current
    const activeTab = el?.querySelector(`[data-agent-id="${activeId}"]`) as HTMLElement
    if (el && activeTab) {
      const { offsetLeft, offsetWidth } = activeTab
      const { scrollLeft, clientWidth } = el
      if (offsetLeft < scrollLeft || offsetLeft + offsetWidth > scrollLeft + clientWidth) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [activeId])

  return (
    <div className="relative flex items-center h-11 px-2 bg-zinc-950 border-b border-zinc-800">
      {/* Left scroll button */}
      {showLeftFade && (
        <button
          onClick={scrollLeft}
          className="fixed left-0 top-0 h-11 w-10 flex items-center justify-center bg-gradient-to-r from-zinc-950 to-transparent z-10 text-zinc-400 hover:text-white transition-colors"
          aria-label="Scroll tabs left"
        >
          ←
        </button>
      )}

      <div
        ref={tabsRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide pb-1"
        role="tablist"
        aria-label="Agent chats"
      >
        {agents.map((agent) => (
          <button
            key={agent.id}
            data-agent-id={agent.id}
            onClick={() => onSwitch(agent.id)}
            role="tab"
            aria-selected={activeId === agent.id}
            aria-label={agent.name}
            className={cn(
              'relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
              'whitespace-nowrap shrink-0',
              activeId === agent.id
                ? 'bg-zinc-800 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
            )}
          >
            <span className="text-base">{agent.emoji}</span>
            <span>{agent.name}</span>
            {/* Badge unread */}
            {unread[agent.id] > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread[agent.id] > 99 ? '99+' : unread[agent.id]}
              </span>
            )}
            {/* Active indicator */}
            {activeId === agent.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        ))}

        {/* New chat button */}
        <button
          onClick={() => onSwitch('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors shrink-0"
          aria-label="New chat"
        >
          <span className="text-lg">+</span>
          <span className="hidden sm:inline">New</span>
        </button>
      </div>

      {/* Right scroll button */}
      {showRightFade && (
        <button
          onClick={scrollRight}
          className="fixed right-0 top-0 h-11 w-10 flex items-center justify-center bg-gradient-to-l from-zinc-950 to-transparent z-10 text-zinc-400 hover:text-white transition-colors"
          aria-label="Scroll tabs right"
        >
          →
        </button>
      )}
    </div>
  )
}