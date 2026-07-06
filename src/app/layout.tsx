import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Z-Dashboard',
  description: 'Multi-Agent AI Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
