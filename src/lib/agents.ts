export interface Agent {
  id: string
  name: string
  emoji: string
  description: string
  model: string
  color: string
  systemPrompt: string
  toolsets?: string[]
  isCustom?: boolean   // true kalau dibuat dari UI, bukan agent bawaan
  backend?: string     // 'openclaw' | 'hermes' — dipakai routing di api/chat
}

export const agents: Agent[] = [
  {
    id: 'main',
    name: 'Ojamet',
    emoji: '🦾',
    description: 'Asisten utama — serba bisa',
    model: '9router/OJAMET',
    color: '#6366f1',
    systemPrompt: 'Kamu adalah Ojamet, asisten AI serba bisa dari Z-Dashboard. Kamu membantu pengguna dengan berbagai pertanyaan, coding, analisis, dan tugas sehari-hari. Gunakan bahasa Indonesia yang natural dan santai. Jawab dengan jelas dan informatif.',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    emoji: '⚡',
    description: 'Coding & eksperimen',
    model: 'hermes-agent',
    color: '#f59e0b',
    systemPrompt: 'Kamu adalah Hermes, asisten AI spesialis coding dan eksperimen teknis dari Z-Dashboard. Kamu ahli dalam Next.js, TypeScript, Prisma, PostgreSQL, dan Railway Deployment. Prioritaskan memberikan solusi yang praktis dan bisa langsung dijalankan. Jika ada error, bantu debug step-by-step.',
    toolsets: ['terminal', 'file', 'web', 'search'],
  },
]

export function getAgent(id: string): Agent | undefined {
  return agents.find(a => a.id === id)
}

export function getSystemPrompt(agentId: string): string {
  return getAgent(agentId)?.systemPrompt || ''
}

// Konversi data agent kustom dari DB ke format Agent yang dipakai komponen
export function customAgentKeAgent(data: {
  id: string
  name: string
  emoji: string
  description: string
  backend: string
  systemPrompt: string
}): Agent {
  return {
    id: data.id,
    name: data.name,
    emoji: data.emoji,
    description: data.description,
    model: data.backend === 'hermes' ? 'hermes-agent' : '9router/OJAMET',
    color: '#8b5cf6',
    systemPrompt: data.systemPrompt,
    backend: data.backend,
    isCustom: true,
  }
}
