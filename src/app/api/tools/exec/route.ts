import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

export const runtime = 'nodejs'

const execAsync = promisify(exec)

// WHITELIST command yang diizinkan — tidak ada command destruktif
// Command di luar daftar ini akan ditolak
const ALLOWED_COMMANDS = [
  /^npm (install|ci|run build|run start|audit)(\s.*)?$/,
  /^node (scripts\/migrate\.js|scripts\/seed\.js)(\s.*)?$/,
  /^npx prisma (generate|db push|migrate deploy|studio)(\s.*)?$/,
  /^ls(\s.*)?$/,
  /^cat [\w\/\.\-]+$/,
  /^echo .+$/,
  /^git (status|log|diff|pull)(\s.*)?$/,
]

function isAllowed(cmd: string): boolean {
  return ALLOWED_COMMANDS.some(r => r.test(cmd.trim()))
}

// Hanya bisa dipanggil dari server internal (tool injection di api/chat)
// Cek origin request — tolak kalau dari luar
function isInternalRequest(req: NextRequest): boolean {
  const host = req.headers.get('host') || ''
  const forwarded = req.headers.get('x-forwarded-for') || ''
  const realIp = req.headers.get('x-real-ip') || ''

  // Akses dari localhost atau dari server Railway sendiri
  const isLocal = host.startsWith('localhost') || host.startsWith('127.')
  const isRailwayInternal = !forwarded && !realIp // tidak ada proxy = internal call

  return isLocal || isRailwayInternal
}

export async function POST(req: NextRequest) {
  // Proteksi: hanya dari internal
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: 'Forbidden — endpoint ini hanya untuk akses internal' }, { status: 403 })
  }

  const { command, cwd } = await req.json()

  if (!command) {
    return NextResponse.json({ error: 'command wajib diisi' }, { status: 400 })
  }

  // Whitelist check
  if (!isAllowed(command)) {
    return NextResponse.json({
      error: `Command tidak diizinkan: "${command}". Hanya command yang aman yang diperbolehkan.`,
      allowed: ALLOWED_COMMANDS.map(r => r.toString()),
    }, { status: 403 })
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || '/app',
      timeout: 60000, // max 60 detik
      env: { ...process.env },
    })

    return NextResponse.json({
      ok: true,
      command,
      stdout: stdout.slice(0, 5000), // max 5KB output
      stderr: stderr.slice(0, 2000),
    })
  } catch (err: unknown) {
    const e = err as { message?: string; stdout?: string; stderr?: string }
    return NextResponse.json({
      ok: false,
      command,
      error: e.message,
      stdout: e.stdout?.slice(0, 5000),
      stderr: e.stderr?.slice(0, 2000),
    }, { status: 500 })
  }
}
