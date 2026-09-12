import type { BasketMatchDetail, BasketStandingRow } from '../types/basketball'

export function buildBasketPreviewMd(opts: {
  match: BasketMatchDetail
  standings?: BasketStandingRow[]
}): string {
  const m = opts.match
  const upcoming = m.quarters.every((q) => q.scoreHome === 0 && q.scoreAway === 0) && m.scoreHome === 0 && m.scoreAway === 0
  const qStr = m.quarters.map((q) => `Q${q.quarter} ${q.scoreHome}–${q.scoreAway}`).join(', ')
  const table = (opts.standings || [])
    .map((r) => `${r.rank}. ${r.teamName}  ${r.matchesPlayed}ott ${r.wins}V ${r.losses}H  ${r.pointsFor}–${r.pointsAgainst}  ${r.totalPoints}p`)
    .join('\n')
  const scorers = m.leaders.length
    ? m.leaders
        .slice(0, 8)
        .map((p) => `- ${p.playerName} (${p.teamName}) ${p.points}p${p.threePointers ? ` · ${p.threePointers}×3P` : ''} · ${p.fouls} virhettä`)
        .join('\n')
    : '_ei pörssiä_'

  return [
    `# ${m.homeTeamName} vs ${m.awayTeamName}`,
    '',
    `${m.date}${m.time ? ` ${m.time}` : ''} · ${m.venueName || ''}`,
    `${m.competitionName} · ${m.categoryName}`,
    upcoming ? 'Vaihe: ennakko' : `Tulos: ${m.scoreHome}–${m.scoreAway}`,
    qStr ? `Neljännekset: ${qStr}` : '',
    m.overtimeScore ? `JA: ${m.overtimeScore.scoreHome}–${m.overtimeScore.scoreAway}` : '',
    '',
    '## Sarjataulukko',
    table ? `\`\`\`\n${table}\n\`\`\`` : '_ei taulukkoa_',
    '',
    '## Pistepörssi',
    scorers,
    '',
    '## Joukkuevirheet',
    `- ${m.homeTeamName}: ${m.teamFoulsHome}/5${m.isHomeBonusFreeThrow ? ' (bonus)' : ''}`,
    `- ${m.awayTeamName}: ${m.teamFoulsAway}/5${m.isAwayBonusFreeThrow ? ' (bonus)' : ''}`,
    '',
    '## Prompt tekoälylle',
    '',
    'Kopioi tämä osio + yllä oleva data malliin. Vastaa suomeksi, valmentajalle, juniori koripallo.',
    '',
    '```',
    'Olet juniorikoripallon otteluanalyytikko. Käytä VAIN tämän dokumentin lukuja. Älä keksi heittoja, syöttöjä tai plus-miinusta. Jos tieto puuttuu, sano "ei datassa". Ei xG, ei NBA-advanced.',
    '',
    `Ottelu: ${m.homeTeamName} vs ${m.awayTeamName}, ${m.date}${m.time ? ` ${m.time}` : ''}.`,
    '',
    'Tee tämä rakenne:',
    '1. Ennakko tai neljännesanalyysi (Q1–Q4, jos JA).',
    '2. Avainpelaajat: pisteet, 3P, virheet. Bonus-vapaaheittotilanne.',
    '3. Ennuste: 3 skenaariota (koti / tasainen / vieras) pistehaarukalla.',
    '4. Valmentajan 4 tekoa: avausneljännes, virhetilanne, timeoutit, loppuhetket.',
    '',
    'Sävy: asiallinen. Juniorit. 4 neljännestä, ei jalkapallon keltaisia, ei salibandyn jäähyjä.',
    '```',
    '',
    `_Luotu basketball-stats, ottelu ${m.matchId}_`,
  ]
    .filter((l) => l !== '')
    .join('\n')
}
