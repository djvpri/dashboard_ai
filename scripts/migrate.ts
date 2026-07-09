import postgres from 'postgres'

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' })

  await sql`
    CREATE TABLE IF NOT EXISTS custom_agents (
      id text PRIMARY KEY,
      name text NOT NULL,
      emoji text NOT NULL DEFAULT '🤖',
      description text NOT NULL DEFAULT '',
      backend text NOT NULL DEFAULT 'openclaw',
      system_prompt text NOT NULL DEFAULT '',
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `

  console.log('Table created')
  await sql.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})