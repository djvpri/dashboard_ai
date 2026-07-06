export interface Agent {
  id: string
  name: string
  emoji: string
  description: string
  model: string
  color: string
}

export const agents: Agent[] = [
  {
    id: 'main',
    name: 'Ojamet',
    emoji: '🦾',
    description: 'Asisten utama — serba bisa',
    model: '9router/OJAMET',
    color: '#6366f1',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    emoji: '⚡',
    description: 'Coding & eksperimen',
    model: 'hermes',
    color: '#f59e0b',
  },
]
