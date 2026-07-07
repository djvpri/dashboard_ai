import { notFound } from 'next/navigation'
import { getAgent } from '@/lib/agents'
import ChatPageClient from './ChatPageClient'

export default async function ChatPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params
  const agent = getAgent(agentId)

  if (!agent) {
    notFound()
  }

  return <ChatPageClient agent={agent} />
}