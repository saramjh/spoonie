import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261113054444_restrict_bookmark_reads_to_owner.sql'), 'utf8')
const fetcher = readFileSync(resolve(__dirname, 'bookmark-repository.ts'), 'utf8')

describe('bookmark privacy deployment contract', () => {
  it('revokes anonymous bookmark reads and drops the broad SELECT policy', () => {
    expect(migration).toMatch(/drop policy if exists "All users can view bookmarks" on public\.bookmarks/i)
    expect(migration).toMatch(/revoke select on table public\.bookmarks from anon/i)
  })
  it('keeps client bookmark listing user-scoped', () => {
    expect(fetcher).toMatch(/\.from\('bookmarks'\)/)
    expect(fetcher).toMatch(/\.eq\('user_id', userId\)/)
  })
})
