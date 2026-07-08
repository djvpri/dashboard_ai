import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function callInternal(path: string, opts: RequestInit = {}): Promise<Record<string, unknown>> {
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

      case 'projects': {
        const data = await callInternal('/api/tools/railway?action=projects')
        return NextResponse.json(data)
      }

      case 'check_errors': {
        const lines = body.lines || 300
        const data = await callInternal(`/api/tools/railway?action=logs&lines=${lines}`)
        if (data.error) return NextResponse.json({ error: data.error }, { status: 500 })
        return NextResponse.json({
          deploymentStatus: data.deployment ? (data.deployment as Record<string,unknown>).status : 'unknown',
          deploymentTime: data.deployment ? (data.deployment as Record<string,unknown>).createdAt : null,
          totalLogLines: data.totalLines,
          errorCount: data.errorCount,
          errors: data.errors,
          recentLogs: data.recentLogs,
        })
      }

      case 'get_deployments': {
        const data = await callInternal('/api/tools/railway?action=deployments')
        return NextResponse.json(data)
      }

      case 'get_file': {
        const { path: filePath } = body
        if (!filePath) return NextResponse.json({ error: 'path wajib diisi' }, { status: 400 })
        const data = await callInternal(`/api/tools/github?action=file&path=${encodeURIComponent(filePath)}`)
        return NextResponse.json(data)
      }

      case 'list_files': {
        const { path: dirPath = '' } = body
        const data = await callInternal(`/api/tools/github?action=list&path=${encodeURIComponent(dirPath)}`)
        return NextResponse.json(data)
      }

      case 'search_code': {
        const { query } = body
        if (!query) return NextResponse.json({ error: 'query wajib diisi' }, { status: 400 })
        const data = await callInternal(`/api/tools/github?action=search&q=${encodeURIComponent(query)}`)
        return NextResponse.json(data)
      }

      case 'get_commits': {
        const data = await callInternal('/api/tools/github?action=commits')
        return NextResponse.json(data)
      }

      case 'create_pr': {
        const { title, prBody, branch, files } = body
        if (!title || !branch || !files?.length) {
          return NextResponse.json({ error: 'title, branch, files wajib diisi' }, { status: 400 })
        }
        const data = await callInternal('/api/tools/github', {
          method: 'POST',
          body: JSON.stringify({ action: 'pr', title, prBody, branch, files }),
        })
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({
          error: `Action '${action}' tidak dikenal`,
          available: ['projects', 'check_errors', 'get_deployments', 'get_file', 'list_files', 'search_code', 'get_commits', 'create_pr'],
        }, { status: 400 })
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    description: 'DevOps tools untuk ekosistem Zomet di Railway',
    tools: [
      { action: 'projects', desc: 'Status semua project Railway' },
      { action: 'check_errors', desc: 'Log + error ZPOS terbaru', params: { lines: 300 } },
      { action: 'get_deployments', desc: '5 deployment terakhir ZPOS' },
      { action: 'get_file', desc: 'Baca file dari repo ZPOS', params: { path: 'src/...' } },
      { action: 'list_files', desc: 'List folder repo ZPOS', params: { path: '' } },
      { action: 'search_code', desc: 'Cari kode di repo ZPOS', params: { query: '...' } },
      { action: 'get_commits', desc: '10 commit terakhir ZPOS' },
      { action: 'create_pr', desc: 'Buat PR fix', params: { title: '', branch: '', files: [] } },
    ],
  })
}
