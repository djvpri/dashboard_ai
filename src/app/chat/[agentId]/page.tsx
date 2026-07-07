import { getAgent } from '@/lib/agents'
import Sidebar from '@/components/Sidebar'
import ChatWindow from '@/components/ChatWindow'

export default async function ChatPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params
  const agent = getAgent(agentId)

  if (!agent) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-zinc-400">Agent "{agentId}" tidak ditemukan</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 lg:flex-1">
        <ChatWindow key={agent.id} agent={agent} />
      </main>
    </div>
  )
}
