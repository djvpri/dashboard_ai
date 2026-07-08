import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN
const RAILWAY_API = 'https://backboard.railway.app/graphql/v2'

const ZPOS = {
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
    return NextResponse.json({ error: 'RAILWAY_TOKEN belum dikonfigurasi di env var dashboard_ai' }, { status: 503 })
  }

  const action = req.nextUrl.searchParams.get('action') || 'status'
  const lines = parseInt(req.nextUrl.searchParams.get('lines') || '200')

  try {
    if (action === 'deployments') {
      const data = await gql(`
        query($serviceId: String!, $environmentId: String!) {
          deployments(
            input: { serviceId: $serviceId, environmentId: $environmentId }
            first: 5
          ) {
            edges {
              node {
                id status createdAt url
                meta { commitMessage commitHash branch }
              }
            }
          }
        }
      `, { serviceId: ZPOS.serviceId, environmentId: ZPOS.environmentId })
      const deployments = data.deployments?.edges?.map((e: { node: unknown }) => e.node) ?? []
      return NextResponse.json({ deployments })
    }

    if (action === 'logs') {
      // Ambil deployment terbaru
      const depData = await gql(`
        query($serviceId: String!, $environmentId: String!) {
          deployments(
            input: { serviceId: $serviceId, environmentId: $environmentId }
            first: 1
          ) {
            edges { node { id status createdAt } }
          }
        }
      `, { serviceId: ZPOS.serviceId, environmentId: ZPOS.environmentId })

      const latestDep = depData.deployments?.edges?.[0]?.node
      if (!latestDep) return NextResponse.json({ error: 'Tidak ada deployment ditemukan' }, { status: 404 })

      // Fetch log deployment — coba beberapa variasi argument
      // karena Railway GraphQL schema berubah-ubah
      let logs: { timestamp: string; message: string; severity: string }[] = []
      
      // Coba tanpa argument dulu
      try {
        const logData = await gql(`
          query($deploymentId: String!) {
            deploymentLogs(deploymentId: $deploymentId) {
              timestamp message severity
            }
          }
        `, { deploymentId: latestDep.id })
        logs = logData.deploymentLogs ?? []
      } catch {
        // Coba dengan limit
        try {
          const logData = await gql(`
            query($deploymentId: String!) {
              deploymentLogs(deploymentId: $deploymentId, limit: ${lines}) {
                timestamp message severity
              }
            }
          `, { deploymentId: latestDep.id })
          logs = logData.deploymentLogs ?? []
        } catch (e2) {
          throw new Error(`deploymentLogs gagal: ${e2 instanceof Error ? e2.message : e2}`)
        }
      }
      const formatted = logs.map(l =>
        `[${new Date(l.timestamp).toISOString()}] [${l.severity || 'INFO'}] ${l.message}`
      ).join('\n')

      const errors = logs
        .filter(l => l.severity === 'ERROR' || l.message?.toLowerCase().includes('error'))
        .map(l => l.message)

      return NextResponse.json({
        deployment: latestDep,
        logs: formatted,
        totalLines: logs.length,
        errorCount: errors.length,
        errors: errors.slice(0, 30),
        recentLogs: logs.slice(-100).map(l => `[${l.severity}] ${l.message}`).join('\n'),
      })
    }

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
      `, { projectId: ZPOS.projectId })
      return NextResponse.json({ project: data.project })
    }

    return NextResponse.json({ error: 'Action tidak dikenal: logs | deployments | status' }, { status: 400 })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
