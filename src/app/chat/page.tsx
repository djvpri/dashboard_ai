import { agents } from '@/lib/agents'
import ChatPageClient from './ChatPageClient'

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ agent?: string }> }) {
  const params = await searchParams
  const agentId = params.agent || agents[0].id

  // Agent kustom (dari DB) tidak ada di daftar bawaan — jangan langsung
  // notFound(). Kirim agentId ke client, ChatPageClient yang akan load
  // agent kustom dari /api/agents setelah mount dan set activeId.
  const initialAgent = agents.find(a => a.id === agentId) ?? agents[0]

  return <ChatPageClient initialAgent={initialAgent} agents={agents} initialAgentId={agentId} />
}
