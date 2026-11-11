import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CuratorsPage, { metadata } from './page'
import { CURATOR_GROUPS } from './curator-ids'
import { createSupabasePublicClient } from '@/shared/infra/supabase-public'

vi.mock('@/shared/infra/supabase-public', () => ({ createSupabasePublicClient: vi.fn() }))

const entries = CURATOR_GROUPS.flatMap(group => group.curators.map(c => ({ ...c, group: group.category })))
const valid = (name: string, code: string, publicId: string) => ({
  public_id: publicId,
  username: name,
  avatar_url: '/curator-avatars/' + code + '.svg',
  display_name: name,
  profile_message: 'Spoonie 레시피 큐레이터 · 집밥\n한 끼를 잘 소개합니다.',
  entity_type: 'organization',
  is_profile_public: true,
})

function fakeData(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn(async () => ({ data, error })),
  }
  vi.mocked(createSupabasePublicClient).mockReturnValue(
    { from: vi.fn(() => query) } as unknown as ReturnType<typeof createSupabasePublicClient>
  )
  return query
}

beforeEach(() => vi.clearAllMocks())

describe('Spoonie official curator discovery', () => {
  it('pins 18 unique verified public identities grouped by recipes, desserts and drinks', () => {
    expect(entries).toHaveLength(18)
    expect(new Set(entries.map(c => c.publicId)).size).toBe(18)
    expect(new Set(entries.map(c => c.code)).size).toBe(18)
    expect(CURATOR_GROUPS.map(g => g.category)).toEqual(['요리', '디저트', '음료'])
    expect(metadata.robots).toMatchObject({ index: false, follow: true })
  })
  it('renders only the exact official identities, without fabricating followers or published items', async () => {
    const rows = entries.map((entry) => valid(entry.code.toUpperCase(), entry.code, entry.publicId))
    const query = fakeData([...rows, { ...rows[0], public_id: 'fraudulent' }])
    const html = renderToStaticMarkup(await CuratorsPage())
    expect(query.in).toHaveBeenCalledWith('public_id', entries.map(x => x.publicId))
    for (const c of entries) expect(html).toContain('/profile/' + c.publicId)
    expect((html.match(/프로필 보기/g) || []).length).toBeGreaterThanOrEqual(18)
    expect(html).not.toContain('/profile/fraudulent')
    expect(html).not.toContain('팔로워 100')
    expect(html).toContain('/curator-avatars/')
    expect(html).not.toContain('spoonie_')
  })
  it('excludes a profile whose name/handle does not match the verified editorial identity', async () => {
    const trusted = valid('보리', 'bori', entries[0].publicId)
    fakeData([trusted, { ...trusted, public_id: entries[1].publicId, username: 'regular_member' }])
    const html = renderToStaticMarkup(await CuratorsPage())
    expect(html).toContain('/profile/' + entries[0].publicId)
    expect(html).not.toContain('/profile/' + entries[1].publicId)
  })
  it('does not invent cards if public profile data is unavailable', async () => {
    fakeData(null, new Error('read unavailable'))
    const html = renderToStaticMarkup(await CuratorsPage())
    expect(html).toContain('프로필을 불러올 수 없습니다')
    expect(html).not.toContain('/profile/' + entries[0].publicId)
  })
})
