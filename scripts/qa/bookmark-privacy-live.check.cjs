// Read-only production verification: never downloads another user's bookmarks.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const envFile = process.env.SPOONIE_QA_ENV_FILE || path.resolve(process.cwd(), '.env.local')
const env = {}
for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/)
  if (!match) continue
  env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
}
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Public Supabase configuration required')
;(async () => {
  const response = await fetch(`${url}/rest/v1/bookmarks?select=item_id`, {
    method: 'HEAD',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
    signal: AbortSignal.timeout(15000),
  })
  assert.ok([401, 403].includes(response.status), `Anonymous bookmark query must be denied, got HTTP ${response.status}`)
  console.log(`PASS anonymous raw bookmark list denied, HTTP ${response.status} (no data downloaded)`)
})().catch(error => { console.error(error.message); process.exitCode = 1 })
