import type { UserProfile } from '@/features/profile/data/profile-repository'

/**
 * A profile is one structured ProfilePage, not a collection of incomplete Recipe
 * rich-result objects. Actual Recipe metadata belongs on each recipe detail URL.
 */
export function buildProfileSchema(profile: UserProfile, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: `${baseUrl}/profile/${profile.public_id}`,
    ...(profile.created_at && { dateCreated: profile.created_at }),
    mainEntity: {
      '@type': profile.entity_type === 'organization' ? 'Organization' : 'Person',
      name: profile.display_name || profile.username,
      alternateName: profile.username,
      identifier: profile.public_id,
      url: `${baseUrl}/profile/${profile.public_id}`,
      ...(profile.profile_message && { description: profile.profile_message.slice(0, 300) }),
      ...(profile.avatar_url && { image: profile.avatar_url }),
    },
  }
}
