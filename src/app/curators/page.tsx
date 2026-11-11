import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabasePublicClient } from '@/shared/infra/supabase-public'

// Public canonical IDs from the 18 verified official Spoonie editorial identities.
// Do not discover them using editable profile text or treat other users as editorial accounts.
export const CURATOR_GROUPS = [
  {category:"요리",heading:"오늘의 식탁을 더 맛있게",curators:[{code:"bori",publicId:"4e0370b9"},{code:"momo",publicId:"acb74686"},{code:"lin",publicId:"ab5b622b"},{code:"luca",publicId:"5dc31ea2"},{code:"sol",publicId:"3203a3e4"},{code:"nur",publicId:"dbb8f7e4"},{code:"max",publicId:"f15e3c4e"},{code:"nico",publicId:"1a0b3ad8"},{code:"maya",publicId:"5fab6a86"},{code:"tori",publicId:"c99dd304"}]},
  {category:"디저트",heading:"한 숟갈의 달콤한 차이",curators:[{code:"milli",publicId:"950b16a6"},{code:"lulu",publicId:"08060854"},{code:"danbi",publicId:"235df2cb"},{code:"popo",publicId:"7c829da7"}]},
  {category:"음료",heading:"기분에 맞는 한 잔",curators:[{code:"jay",publicId:"f8c456ed"},{code:"bean",publicId:"b87f1bef"},{code:"yuja",publicId:"b1be139e"},{code:"peach",publicId:"e0f47aca"}]}
] as const

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Spoonie 레시피 큐레이터',
  description: '집밥부터 디저트와 음료까지. 취향에 맞는 Spoonie 레시피 큐레이터를 발견하고 팔로우하세요.',
  alternates: { canonical: (process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr') + '/curators' },
  robots: { index: false, follow: true }, // Newly created editors have no public Recipes yet.
}

type OfficialProfile = {
  public_id: string
  username: string
  display_name: string | null
  profile_message: string | null
  entity_type: string
  is_profile_public: boolean
}

export default async function CuratorsPage() {
  const groups = CURATOR_GROUPS
  const ids = groups.flatMap(group => group.curators.map(c => c.publicId))
  const { data, error } = await createSupabasePublicClient()
    .from('profiles')
    .select('public_id, username, display_name, profile_message, entity_type, is_profile_public')
    .in('public_id', ids)

  // Profile text is not proof of editorial ownership; an exact verified canonical
  // identifier and handle are both required. No fake activity/follower metrics.
  const profiles = new Map(
    ((error ? [] : data) as OfficialProfile[] | null || [])
      .map(p => [p.public_id, p] as const)
  )
  const verified = (entry: { code: string; publicId: string }) => {
    const p = profiles.get(entry.publicId)
    return p && p.username === 'spoonie_' + entry.code &&
      p.entity_type === 'organization' && p.is_profile_public === true &&
      p.profile_message?.startsWith('Spoonie 레시피 큐레이터') ? p : null
  }
  const readyGroups = groups.map(group => ({
    ...group, profiles: group.curators.map(verified).filter((p): p is OfficialProfile => Boolean(p))
  })).filter(group => group.profiles.length > 0)

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-paper px-4 pb-16 pt-7 text-ink sm:px-7">
      <div className="border-b border-border pb-7">
        <p className="text-meta font-semibold tracking-wide text-ink-soft">Spoonie EDITORS</p>
        <h1 className="mt-2 text-display font-semibold">맛을 소개하는 다양한 시선</h1>
        <p className="mt-3 max-w-lg text-body leading-7 text-ink-soft">
          집에서 만드는 한 끼부터 부드러운 디저트, 기분에 맞는 한 잔까지.
          서로 다른 맛의 취향을 가진 Spoonie 큐레이터를 만나보세요.
          마음에 드는 큐레이터를 팔로우하면 앞으로 소개할 레시피를 이어서 볼 수 있어요.
        </p>
      </div>
      {readyGroups.length === 0 ? (
        <p className="py-12 text-body text-ink-soft" role="status">
          지금은 큐레이터 프로필을 불러올 수 없습니다. 잠시 후 다시 확인해 주세요.
        </p>
      ) : readyGroups.map(group => (
        <section key={group.category} className="border-b border-border py-7" aria-label={group.category}>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <p className="text-meta text-ink-soft">{group.category}</p>
              <h2 className="mt-1 text-heading font-semibold">{group.heading}</h2>
            </div>
            <span className="text-meta tabular-nums text-ink-soft">{group.profiles.length}명</span>
          </div>
          <ul className="divide-y divide-border">
            {group.profiles.map(profile => {
              const [,intro = ''] = (profile.profile_message || '').split('\n',2)
              return (
                <li key={profile.public_id}>
                  <Link
                    href={'/profile/' + profile.public_id}
                    aria-label={profile.display_name + ' 큐레이터 프로필 보기'}
                    className="group flex min-h-24 items-center gap-4 py-4 transition-colors hover:bg-paper-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-paper-tint text-heading font-semibold text-ink">
                      {(profile.display_name || '').slice(0,1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-label font-semibold">{profile.display_name}</span>
                      <span className="mt-1 block text-meta text-ink-soft">
                        {(profile.profile_message || '').split('\n')[0].replace(/^Spoonie 레시피 큐레이터 · /,'')}
                      </span>
                      {intro && <span className="mt-1 block text-body leading-6 text-ink-soft">{intro}</span>}
                    </span>
                    <span className="shrink-0 text-meta font-semibold text-ink-soft group-hover:text-ink">프로필 보기</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <p className="pt-6 text-meta leading-6 text-ink-soft">
        큐레이터는 Spoonie가 운영하는 레시피 소개 계정입니다.
        실제 레시피 원작자와 원본 출처는 각각의 레시피에서 별도로 안내합니다.
      </p>
    </main>
  )
}
