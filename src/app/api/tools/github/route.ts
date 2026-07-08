import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN_ZPOS
const REPO = 'djvpri/zpos'
const GITHUB_API = 'https://api.github.com'

async function ghFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub API ${res.status}: ${err.slice(0, 200)}`)
  }
  return res.json()
}

// GET /api/tools/github?action=file&path=src/app/page.tsx
// GET /api/tools/github?action=list&path=src/app
// GET /api/tools/github?action=search&q=error+message
// POST /api/tools/github  { action: 'pr', title, body, branch, files: [{path, content}] }
export async function GET(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GITHUB_TOKEN_ZPOS belum dikonfigurasi' }, { status: 503 })
  }

  const action = req.nextUrl.searchParams.get('action') || 'list'
  const path = req.nextUrl.searchParams.get('path') || ''
  const q = req.nextUrl.searchParams.get('q') || ''

  try {
    if (action === 'file') {
      if (!path) return NextResponse.json({ error: 'path wajib diisi' }, { status: 400 })
      const data = await ghFetch(`/repos/${REPO}/contents/${path}`)
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return NextResponse.json({ path, content, sha: data.sha, size: data.size })
    }

    if (action === 'list') {
      const data = await ghFetch(`/repos/${REPO}/contents/${path}`)
      const items = Array.isArray(data) ? data.map((f: any) => ({
        name: f.name, path: f.path, type: f.type, size: f.size
      })) : [data]
      return NextResponse.json({ path, items })
    }

    if (action === 'search') {
      if (!q) return NextResponse.json({ error: 'q wajib diisi' }, { status: 400 })
      const data = await ghFetch(
        `/search/code?q=${encodeURIComponent(q + ' repo:' + REPO)}&per_page=10`
      )
      const results = data.items?.map((i: any) => ({
        path: i.path, name: i.name, url: i.html_url,
        snippet: i.text_matches?.[0]?.fragment
      })) ?? []
      return NextResponse.json({ query: q, results })
    }

    if (action === 'commits') {
      const data = await ghFetch(`/repos/${REPO}/commits?per_page=10`)
      const commits = data.map((c: any) => ({
        sha: c.sha?.slice(0, 7),
        message: c.commit?.message?.split('\n')[0],
        date: c.commit?.author?.date,
        author: c.commit?.author?.name,
      }))
      return NextResponse.json({ commits })
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GITHUB_TOKEN_ZPOS belum dikonfigurasi' }, { status: 503 })
  }

  const body = await req.json()
  const { action } = body

  try {
    if (action === 'pr') {
      const { title, prBody, branch, files } = body
      if (!title || !branch || !files?.length) {
        return NextResponse.json({ error: 'title, branch, files wajib diisi' }, { status: 400 })
      }

      // 1. Ambil SHA commit main terbaru
      const mainRef = await ghFetch(`/repos/${REPO}/git/ref/heads/main`)
      const baseSha = mainRef.object.sha

      // 2. Buat branch baru
      await ghFetch(`/repos/${REPO}/git/refs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
      }).catch(() => {}) // branch mungkin sudah ada

      // 3. Update setiap file
      for (const file of files) {
        // Ambil SHA file yang ada (kalau ada)
        const existing = await ghFetch(`/repos/${REPO}/contents/${file.path}`)
          .catch(() => null)

        await ghFetch(`/repos/${REPO}/contents/${file.path}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `fix: ${file.path} — proposed by AI agent`,
            content: Buffer.from(file.content).toString('base64'),
            branch,
            ...(existing?.sha ? { sha: existing.sha } : {}),
          }),
        })
      }

      // 4. Buat PR
      const pr = await ghFetch(`/repos/${REPO}/pulls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body: prBody || 'Proposed fix dari AI agent Z-Dashboard',
          head: branch,
          base: 'main',
        }),
      })

      return NextResponse.json({ ok: true, pr: { number: pr.number, url: pr.html_url, title: pr.title } })
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
