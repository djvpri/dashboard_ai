import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

export const runtime = 'nodejs'

const execAsync = promisify(exec)

const BLOCKED = [
  'rm -rf /',
  'rm -rf /app',
  'rm -rf /etc',
  'mkfs',
  ':(){:|:&};:',
]

export async function POST(req: NextRequest) {
  const { cmd, cwd } = await req.json()
  if (!cmd || typeof cmd !== 'string') {
    return NextResponse.json({ error: 'cmd wajib diisi' }, { status: 400 })
  }

  for (const blocked of BLOCKED) {
    if (cmd.includes(blocked)) {
      return NextResponse.json({ error: 'Command diblokir: ' + blocked }, { status: 403 })
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
