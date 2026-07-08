import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN
const RAILWAY_API = 'https://backboard.railway.app/graphql/v2'

// Default config ZPOS — bisa di-override via query param
const DEFAULTS = {
  serviceId: process.env.RAILWAY_ZPOS_SERVICE_ID || 'f026c44d-60cd-4bb8-a277-a3cd9dec70a7',
  environmentId: process.env.RAILWAY_ZPOS_ENV_ID || 'eea0eae9-23a7-4611-845f-9cb6176cceaa',
  projectId: process.env.RAILWAY_ZPOS_PROJECT_ID || '1c4957a8-adbd-4072-ba9d-fd91e785738f',
}

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RAILWAY_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Railway API ${res.status}: ${txt.slice(0, 300)}`)
  }
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

export async function GET(req: NextRequest) {
  if (!RAILWAY_TOKEN) {
    return NextResponse.json({ error: 'RAILWAY_TOKEN belum dikonfigurasi' }, { status: 503 })
  }

  const p = req.nextUrl.searchParams
  const action = p.get('action') || 'status'
  const lines = parseInt(p.get('lines') || '200')

  // Bisa override per-request untuk support semua app
  const serviceId = p.get('serviceId') || DEFAULTS.serviceId
  const environmentId = p.get('environmentId') || DEFAULTS.environmentId
  const projectId = p.get('projectId') || DEFAULTS.projectId
  const deploymentId = p.get('deploymentId') // kalau sudah diketahui, skip fetch deployment terbaru

  try {
    // ── LIST ALL PROJECTS ─────────────────────────────────────────────
    if (action === 'projects') {
      const data = await gql(`
        query {
          projects(first: 50) {
            edges {
              node {
                id name
                services {
                  edges {
                    node {
                      id name
                      deployments(first: 1) {
                        edges { node { id status createdAt } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `)
      const SKIP = ['postgres','postgresql','redis','mysql']
      const projects = data.projects?.edges?.map((p: any) => ({
        id: p.node.id,
        name: p.node.name,
        services: p.node.services?.edges
          ?.filter((s: any) => !SKIP.includes(s.node.name.toLowerCase()))
          ?.map((s: any) => ({
            id: s.node.id,
            name: s.node.name,
            status: s.node.deployments?.edges?.[0]?.node?.status ?? 'NO_DEPLOY',
            deployedAt: s.node.deployments?.edges?.[0]?.node?.createdAt ?? null,
            deploymentId: s.node.deployments?.edges?.[0]?.node?.id ?? null,
          })) ?? [],
      })) ?? []
      return NextResponse.json({ projects })
    }

    // ── DEPLOYMENTS ───────────────────────────────────────────────────
    if (action === 'deployments') {
      const data = await gql(`
        query($serviceId: String!, $environmentId: String!) {
          deployments(
            input: { serviceId: $serviceId, environmentId: $environmentId }
            first: 5
          ) {
            edges {
              node { id status createdAt url
                meta { commitMessage commitHash branch }
              }
            }
          }
        }
      `, { serviceId, environmentId })
      return NextResponse.json({
        deployments: data.deployments?.edges?.map((e: any) => e.node) ?? []
      })
    }

    // ── LOGS ──────────────────────────────────────────────────────────
    if (action === 'logs') {
      let depId = deploymentId

      // Kalau deploymentId tidak diberikan, ambil deployment terbaru
      if (!depId) {
        const depData = await gql(`
          query($serviceId: String!, $environmentId: String!) {
            deployments(
              input: { serviceId: $serviceId, environmentId: $environmentId }
              first: 1
            ) {
              edges { node { id status createdAt } }
            }
          }
        `, { serviceId, environmentId })
        const latest = depData.deployments?.edges?.[0]?.node
        if (!latest) return NextResponse.json({ error: 'Tidak ada deployment ditemukan' }, { status: 404 })
        depId = latest.id
      }

      // Fetch log — coba tanpa argument dulu
      let logs: { timestamp: string; message: string; severity: string }[] = []
      try {
        const logData = await gql(`
          query($deploymentId: String!) {
            deploymentLogs(deploymentId: $deploymentId) {
              timestamp message severity
            }
          }
        `, { deploymentId: depId })
        logs = logData.deploymentLogs ?? []
      } catch {
        try {
          const logData = await gql(`
            query($deploymentId: String!) {
              deploymentLogs(deploymentId: $deploymentId, limit: ${lines}) {
                timestamp message severity
              }
            }
          `, { deploymentId: depId })
          logs = logData.deploymentLogs ?? []
        } catch (e2) {
          throw new Error(`deploymentLogs gagal: ${e2 instanceof Error ? e2.message : e2}`)
        }
      }

      const errors = logs.filter(l =>
        l.severity === 'ERROR' || l.message?.toLowerCase().includes('error')
      ).map(l => l.message)

      return NextResponse.json({
        deploymentId: depId,
        totalLines: logs.length,
        errorCount: errors.length,
        errors: errors.slice(0, 30),
        logs: logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.severity}] ${l.message}`).join('\n'),
        recentLogs: logs.slice(-150).map(l => `[${l.severity}] ${l.message}`).join('\n'),
      })
    }

    // ── STATUS PROJECT ────────────────────────────────────────────────
    if (action === 'status') {
      const data = await gql(`
        query($projectId: String!) {
          project(id: $projectId) {
            id name
            services {
              edges {
                node {
                  id name
                  deployments(first: 1) {
                    edges { node { id status createdAt url } }
                  }
                }
              }
            }
          }
        }
      `, { projectId })
      return NextResponse.json({ project: data.project })
    }

    return NextResponse.json({ error: 'Action tidak dikenal: projects | logs | deployments | status' }, { status: 400 })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
