import { notFound } from 'next/navigation'
import { getAgent, agents } from '@/lib/agents'
import ChatPageClient from './ChatPageClient'

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ agent?: string }> }) {
  const params = await searchParams
  const agentId = params.agent || agents[0].id
  const agent = getAgent(agentId)
  
  if (!agent) notFound()
  
  return <ChatPageClient initialAgent={agent} agents={agents} />
}