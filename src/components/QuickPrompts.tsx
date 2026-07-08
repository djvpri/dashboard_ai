'use client'

interface QuickPromptsProps {
  prompts: string[]
  onSelect: (prompt: string) => void
}

export default function QuickPrompts({ prompts, onSelect }: QuickPromptsProps) {
  if (!prompts || prompts.length === 0) return null

  return (
    <div className="px-4 pb-3 flex flex-wrap gap-2">
      {prompts.map((p, i) => (
        <button
          key={i}
          onClick={() => onSelect(p)}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-indigo-500/50 text-zinc-300 hover:text-white rounded-full px-3 py-1.5 transition-all duration-150 text-left"
        >
          {p}
        </button>
      ))}
    </div>
  )
}
