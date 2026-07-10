import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { command, timeout = 60000 } = await req.json()
  if (!command) return NextResponse.json({ error: 'No command' }, { status: 400 })

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 512,
      shell: '/bin/bash',
      env: {
        ...process.env,
        HOME: '/root',
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/.local/bin',
      },
    })
    return NextResponse.json({ stdout: stdout || '', stderr: stderr || '', success: true })
  } catch (err: any) {
    return NextResponse.json({
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      success: false,
      exitCode: err.code,
    })
  }
}
