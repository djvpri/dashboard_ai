import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

// Endpoint ini dipanggil oleh Hermes Agent via tool call.
// Hermes tidak perlu tahu detail Railway/GitHub API — cukup panggil
// endpoint ini dengan action yang jelas.
//
// POST /api/tools/devops
// { action: 'check_errors' | 'get_file' | 'list_files' | 'search_code' | 'create_pr' | 'get_commits', ...params }

async function callInternal(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  try {
    switch (action) {

      case 'check_errors': {
        // Ambil log Railway + highlight error
        const lines = body.lines || 300
        const data = await callInternal(`/api/tools/railway?action=logs&lines=${lines}`)
        if (data.error) return NextResponse.json({ error: data.error }, { status: 500 })

        const summary = {
          deploymentStatus: data.deployment?.status,
          deploymentTime: data.deployment?.createdAt,
          totalLogLines: data.totalLines,
          errorCount: data.errors?.length ?? 0,
          errors: data.errors?.slice(0, 20), // maks 20 error lines
          // Sertakan 100 baris log terakhir untuk konteks
          recentLogs: data.logs?.split('\n').slice(-100).join('\n'),
        }
        return NextResponse.json(summary)
      }

      case 'get_deployments': {
        return callInternal('/api/tools/railway?action=deployments')
      }

      case 'projects': {
        return callInternal('/api/tools/railway?action=projects')
      }

      case 'get_file': {
        const { path: filePath } = body
        if (!filePath) return NextResponse.json({ error: 'path wajib diisi' }, { status: 400 })
        return callInternal(`/api/tools/github?action=file&path=${encodeURIComponent(filePath)}`)
      }

      case 'list_files': {
        const { path: dirPath = '' } = body
        return callInternal(`/api/tools/github?action=list&path=${encodeURIComponent(dirPath)}`)
      }

      case 'search_code': {
        const { query } = body
        if (!query) return NextResponse.json({ error: 'query wajib diisi' }, { status: 400 })
        return callInternal(`/api/tools/github?action=search&q=${encodeURIComponent(query)}`)
      }

      case 'get_commits': {
        return callInternal('/api/tools/github?action=commits')
      }

      case 'create_pr': {
        const { title, prBody, branch, files } = body
        if (!title || !branch || !files?.length) {
          return NextResponse.json({ error: 'title, branch, files wajib diisi' }, { status: 400 })
        }
        return callInternal('/api/tools/github', {
          method: 'POST',
          body: JSON.stringify({ action: 'pr', title, prBody, branch, files }),
        })
      }

      default:
        return NextResponse.json({
          error: `Action '${action}' tidak dikenal`,
          available: ['check_errors', 'get_deployments', 'get_file', 'list_files', 'search_code', 'get_commits', 'create_pr'],
        }, { status: 400 })
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

// GET /api/tools/devops — info tools yang tersedia (untuk Hermes)
export async function GET() {
  return NextResponse.json({
    description: 'DevOps tools untuk ZPOS (djvpri/zpos di Railway)',
    tools: [
      { action: 'check_errors', desc: 'Ambil log Railway terbaru + daftar error lines', params: { lines: 'jumlah baris log (default 300)' } },
      { action: 'get_deployments', desc: 'Status 5 deployment terakhir ZPOS' },
      { action: 'get_file', desc: 'Baca isi file dari repo GitHub', params: { path: 'path file, mis. src/app/page.tsx' } },
      { action: 'list_files', desc: 'List file/folder di repo', params: { path: 'folder, kosong = root' } },
      { action: 'search_code', desc: 'Cari kode di repo ZPOS', params: { query: 'kata kunci pencarian' } },
      { action: 'get_commits', desc: '10 commit terakhir di repo ZPOS' },
      { action: 'create_pr', desc: 'Buat PR dengan proposed fix', params: { title: 'judul PR', prBody: 'deskripsi', branch: 'nama branch baru', files: '[{path, content}]' } },
    ],
  })
}
