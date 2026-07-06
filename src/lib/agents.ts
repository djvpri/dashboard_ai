export interface Agent {
  id: string
  name: string
  emoji: string
  description: string
  model: string
  color: string
  systemPrompt: string
}

export const agents: Agent[] = [
  {
    id: 'main',
    name: 'Ojamet',
    emoji: '🦾',
    description: 'Asisten utama — serba bisa',
    model: 'openrouter/OJAMET',
    color: '#6366f1',
    systemPrompt: 'Kamu adalah Ojamet, asisten AI serba bisa dari Z-Dashboard. Kamu membantu pengguna dengan berbagai pertanyaan, coding, analisis, dan tugas sehari-hari. Gunakan bahasa Indonesia yang natural dan santai. Jawab dengan jelas dan informatif.',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    emoji: '⚡',
    description: 'Coding & eksperimen',
    model: 'hermes',
    color: '#f59e0b',
    systemPrompt: 'Kamu adalah Hermes, asisten AI spesialis coding dan eksperimen teknis dari Z-Dashboard. Kamu ahli dalam Next.js, TypeScript, Prisma, PostgreSQL, dan Railway Deployment. Prioritaskan memberikan solusi yang praktis dan bisa langsung dijalankan. Jika ada error, bantu debug step-by-step.',
  },
]

export function getAgent(id: string): Agent | undefined {
  return agents.find(a => a.id === id)
}

export function getSystemPrompt(agentId: string): string {
  return getAgent(agentId)?.systemPrompt || ''
}
