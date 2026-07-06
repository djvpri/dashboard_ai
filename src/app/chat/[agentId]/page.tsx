'use client'

import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ChatWindow from '@/components/ChatWindow'
import { agents } from '@/lib/agents'

export default function ChatPage() {
  const params = useParams()
  const agentId = params.agentId as string
  const agent = agents.find((a) => a.id === agentId)

  if (!agent) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-zinc-400">Agent &quot;{agentId}&quot; tidak ditemukan</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ChatWindow agent={agent} />
    </div>
  )
}
