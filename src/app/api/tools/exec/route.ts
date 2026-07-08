import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

export const runtime = 'nodejs'

const execAsync = promisify(exec)

const ALLOWED_PREFIXES = [
  'npm ', 'node ', 'npx ', 'ls ', 'cat ', 'echo ', 'pwd', 'git ', 'prisma ', 'railway ',
]

const BLOCKED = ['rm -rf', 'sudo', 'curl http', 'wget ', 'chmod 777', '> /dev/']

export async function POST(req: NextRequest) {
  const { cmd, cwd } = await req.json()
  if (!cmd || typeof cmd !== 'string') {
    return NextResponse.json({ error: 'cmd wajib diisi' }, { status: 400 })
  }

  for (const blocked of BLOCKED) {
    if (cmd.includes(blocked)) {
      return NextResponse.json({ error: `Command diblokir: ${blocked}` }, { status: 403 })
    }
  }

  const allowed = ALLOWED_PREFIXES.some(p => cmd.trim().startsWith(p)) || cmd.trim() === 'pwd'
  if (!allowed) {
    return NextResponse.json({
      error: `Tidak diizinkan. Prefix yang boleh: ${ALLOWED_PREFIXES.join(', ')}`,
    }, { status: 403 })
  }

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: cwd || '/app',
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    })
    return NextResponse.json({ ok: true, stdout: stdout.slice(0, 5000), stderr: stderr.slice(0, 1000) })
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    return NextResponse.json({
      ok: false,
      stdout: e.stdout?.slice(0, 5000) || '',
      stderr: e.stderr?.slice(0, 1000) || e.message || String(err),
    }, { status: 500 })
  }
}
