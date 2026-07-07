import { redirect } from 'next/navigation'
import { agents } from '@/lib/agents'

export default function HomePage() {
  redirect(`/chat?agent=${agents[0].id}`)
}
