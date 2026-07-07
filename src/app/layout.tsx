import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Z-Dashboard',
  description: 'Multi-Agent AI Dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Z-Dashboard',
  },
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: light)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Z-Dashboard" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
