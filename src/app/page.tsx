import { redirect } from 'next/navigation'
import { agents } from '@/lib/agents'

// Halaman root langsung redirect ke chat — tidak ada UI yang perlu ditampilkan.
// Middleware sudah handle auth (kalau belum login → /login?redirect=/chat).
export default function HomePage() {
  redirect(`/chat?agent=${agents[0].id}`)
}
