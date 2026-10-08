/**
 * Exact pages on the federation's own results site (tulospalvelu.basket.fi).
 * Routes are taken from that site's router: /match/{id}, /team/{id},
 * /club/{id}, /category/{category}!{competition}/group/{group}/.
 * It has no player page, so there is no player link. Never guess a link:
 * every function returns undefined when an id is missing.
 */
export const FEDERATION_ORIGIN = 'https://tulospalvelu.basket.fi'

const ID = /^\d+$/
const SLUG = /^[A-Za-z0-9_-]+$/

export function federationMatchUrl(matchId?: string): string | undefined {
  return matchId && ID.test(matchId) ? `${FEDERATION_ORIGIN}/match/${matchId}` : undefined
}

export function federationTeamUrl(teamId?: string): string | undefined {
  return teamId && ID.test(teamId) ? `${FEDERATION_ORIGIN}/team/${teamId}` : undefined
}

export function federationClubUrl(clubId?: string): string | undefined {
  return clubId && ID.test(clubId) ? `${FEDERATION_ORIGIN}/club/${clubId}` : undefined
}

export function federationGroupUrl(competitionId?: string, categoryId?: string, groupId?: string): string | undefined {
  if (!competitionId || !categoryId || !groupId) return undefined
  if (!SLUG.test(competitionId) || !SLUG.test(categoryId) || !ID.test(groupId)) return undefined
  return `${FEDERATION_ORIGIN}/category/${categoryId}!${competitionId}/group/${groupId}/`
}
