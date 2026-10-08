import type { BasketMatchDetail, BasketStandingRow } from '../types/basketball'
import { STATE_LABEL } from './matchStatus.ts'
import { formatGameDateTime } from './formatFi.ts'

/** Markdown from Basket.fi data only. Blank periods stay blank; no team-foul or bonus guesses. */
export function buildBasketPreviewMd(opts: { match: BasketMatchDetail; standings?: BasketStandingRow[] }): string {
  const m = opts.match
  const hasScore = m.scoreHome !== null && m.scoreAway !== null
  const qStr = m.quarters
    .map((q) => `${q.quarter === 5 ? 'JA' : `Q${q.quarter}`} ${q.scoreHome ?? ''}–${q.scoreAway ?? ''}`)
    .join(', ')
  const table = (opts.standings || [])
    .map(
      (r) =>
        `${r.rank}. ${r.teamName}  ${r.matchesPlayed} ott ${r.wins}V ${r.losses}H  ${r.pointsFor}–${r.pointsAgainst}  ${r.totalPoints} p`,
    )
    .join('\n')
  const scorers = m.leaders.length
    ? m.leaders
        .slice(0, 8)
        .map(
          (p) =>
            `- ${p.playerName} (${p.teamName}) ${p.points} p${p.threePointers ? ` · ${p.threePointers}×3P` : ''}${p.fouls !== null ? ` · ${p.fouls} virhettä` : ''}`,
        )
        .join('\n')
    : '_ei pelaajakohtaisia pisteitä Basket.fi:ssä_'

  const status = hasScore
    ? `${STATE_LABEL[m.phase]}: ${m.scoreHome}–${m.scoreAway}`
    : m.forfeitText
      ? `Luovutus: ${m.forfeitText}`
      : `Tila: ${STATE_LABEL[m.phase]}`

  return [
    `# ${m.homeTeamName} – ${m.awayTeamName}`,
    '',
    `${formatGameDateTime(m.date, m.time)} (Helsingin aikaa)${m.venueName ? ` · ${m.venueName}` : ''}`,
    [m.competitionName, m.categoryName].filter(Boolean).join(' · '),
    status,
    qStr ? `Neljännekset: ${qStr}` : '',
    '',
    '## Sarjataulukko',
    table ? `\`\`\`\n${table}\n\`\`\`` : '_ei taulukkoa_',
    '',
    '## Pistetilasto',
    scorers,
    '',
    '## Ohje tekoälylle',
    '',
    '```',
    'Käytä VAIN tämän dokumentin tietoja. Älä keksi lukuja, prosentteja tai ennusteita. Jos tieto puuttuu, sano "ei datassa".',
    '```',
    '',
    `_Lähde: Basket.fi (Torneopal), ottelu ${m.matchId}_`,
  ]
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')
}
