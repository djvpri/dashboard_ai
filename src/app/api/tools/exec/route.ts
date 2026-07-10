import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

export const runtime = 'nodejs'

const execAsync = promisify(exec)

// Secret internal: endpoint ini menjalankan shell ARBITRARY, jadi tidak boleh
// dipanggil langsung dari luar (middleware menandai /api/tools sebagai publik).
// Hanya server (api/chat) yang mengirim header x-internal-secret ini.
// FAIL-CLOSED: kalau INTERNAL_TOOL_SECRET belum diset, endpoint menolak semua.
const INTERNAL_SECRET = process.env.INTERNAL_TOOL_SECRET || ''

// Deny-list pertahanan lapis kedua (bukan kontrol utama — kontrol utama = auth).
const BLOCKED: RegExp[] = [
  /rm\s+-[rf]{1,2}\s+(\/(?:\s|$)|\/app|\/etc|\/root|\/home|~|\*)/,
  /rm\s+-[rf]{1,2}\s+--no-preserve-root/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  /:\s*\(\s*\)\s*\{.*\|.*&\s*\}\s*;/,          // fork bomb :(){ :|:& };:
  /\b(shutdown|reboot|halt|poweroff|init\s+0)\b/,
  /chmod\s+-R\s+0?777\s+\//,
  />\s*\/dev\/sd[a-z]/,
  /\|\s*(sh|bash)\b/,                            // curl ... | sh
]

export async function POST(req: NextRequest) {
  // Guard: wajib secret internal — menutup RCE terbuka ke publik.
  if (!INTERNAL_SECRET || req.headers.get('x-internal-secret') !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { cmd, cwd } = await req.json()
  if (!cmd || typeof cmd !== 'string') {
    return NextResponse.json({ error: 'cmd wajib diisi' }, { status: 400 })
  }

  for (const pat of BLOCKED) {
    if (pat.test(cmd)) {
      return NextResponse.json({ error: 'Command diblokir (pola berbahaya)' }, { status: 403 })
    }
  }

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: cwd || '/app',
      timeout: 60000,
      maxBuffer: 1024 * 1024,
      shell: '/bin/bash',
      env: {
        ...process.env,
        HOME: '/root',
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/.local/bin',
      },
    })
    return NextResponse.json({ ok: true, stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 2000) })
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    return NextResponse.json({
      ok: false,
      stdout: e.stdout?.slice(0, 8000) || '',
      stderr: e.stderr?.slice(0, 2000) || e.message || String(err),
    }, { status: 500 })
  }
}
