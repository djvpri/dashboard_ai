import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN
const RAILWAY_API = 'https://backboard.railway.app/graphql/v2'

// Konfigurasi ZPOS — nanti bisa diperluas ke app lain
const ZPOS_CONFIG = {
  serviceId: process.env.RAILWAY_ZPOS_SERVICE_ID || 'f026c44d-60cd-4bb8-a277-a3cd9dec70a7',
  environmentId: process.env.RAILWAY_ZPOS_ENV_ID || 'eea0eae9-23a7-4611-845f-9cb6176cceaa',
  projectId: process.env.RAILWAY_ZPOS_PROJECT_ID || '1c4957a8-adbd-4072-ba9d-fd91e785738f',
}

async function railwayQuery(query: string, variables: Record<string, string>) {
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RAILWAY_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Railway API error: ${res.status}`)
  return res.json()
}

// GET /api/tools/railway?action=logs&lines=100
// GET /api/tools/railway?action=deployments
// GET /api/tools/railway?action=status
export async function GET(req: NextRequest) {
  if (!RAILWAY_TOKEN) {
    return NextResponse.json({ error: 'RAILWAY_TOKEN belum dikonfigurasi' }, { status: 503 })
  }

  const action = req.nextUrl.searchParams.get('action') || 'status'
  const lines = parseInt(req.nextUrl.searchParams.get('lines') || '200')

  try {
    if (action === 'deployments') {
      const data = await railwayQuery(`
        query($serviceId: String!, $environmentId: String!) {
          deployments(
            input: { serviceId: $serviceId, environmentId: $environmentId }
            first: 5
          ) {
            edges {
              node {
                id
                status
                createdAt
                url
                meta { commitMessage commitHash branch }
              }
            }
          }
        }
      `, { serviceId: ZPOS_CONFIG.serviceId, environmentId: ZPOS_CONFIG.environmentId })

      const deployments = data.data?.deployments?.edges?.map((e: any) => e.node) ?? []
      return NextResponse.json({ deployments })
    }

    if (action === 'logs') {
      // Ambil deployment terbaru dulu
      const depData = await railwayQuery(`
        query($serviceId: String!, $environmentId: String!) {
          deployments(
            input: { serviceId: $serviceId, environmentId: $environmentId }
            first: 1
          ) {
            edges { node { id status createdAt } }
          }
        }
      `, { serviceId: ZPOS_CONFIG.serviceId, environmentId: ZPOS_CONFIG.environmentId })

      const latestDep = depData.data?.deployments?.edges?.[0]?.node
      if (!latestDep) return NextResponse.json({ error: 'Tidak ada deployment ditemukan' }, { status: 404 })

      // Fetch log deployment
      const logData = await railwayQuery(`
        query($deploymentId: String!, $lines: Int) {
          deploymentLogs(deploymentId: $deploymentId, tail: $lines) {
            timestamp
            message
            severity
          }
        }
      `, { deploymentId: latestDep.id, lines: lines.toString() })

      const logs = logData.data?.deploymentLogs ?? []
      const formatted = logs.map((l: any) =>
        `[${new Date(l.timestamp).toISOString()}] [${l.severity || 'INFO'}] ${l.message}`
      ).join('\n')

      return NextResponse.json({
        deployment: latestDep,
        logs: formatted,
        totalLines: logs.length,
        errors: logs.filter((l: any) =>
          l.severity === 'ERROR' || l.message?.toLowerCase().includes('error')
        ).map((l: any) => l.message),
      })
    }

    if (action === 'status') {
      const data = await railwayQuery(`
        query($projectId: String!) {
          project(id: $projectId) {
            id
            name
            services {
              edges {
                node {
                  id
                  name
                  deployments(first: 1) {
                    edges {
                      node { id status createdAt url }
                    }
                  }
                }
              }
            }
          }
        }
      `, { projectId: ZPOS_CONFIG.projectId })

      return NextResponse.json({ project: data.data?.project })
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
