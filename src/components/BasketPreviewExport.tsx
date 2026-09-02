import React, { useState } from 'react'
import type { BasketMatchDetail } from '../types/basketball'
import { Share2, Check, Copy } from 'lucide-react'

interface BasketPreviewExportProps {
  match: BasketMatchDetail
}

export const BasketPreviewExport: React.FC<BasketPreviewExportProps> = ({ match }) => {
  const [copied, setCopied] = useState(false)

  const generateMarkdown = () => {
    const qStr = match.quarters.map((q) => `Q${q.quarter}: ${q.scoreHome}–${q.scoreAway}`).join(', ')
    const topScorersStr = match.leaders
      .slice(0, 4)
      .map((p) => `• ${p.playerName} (${p.teamName}): ${p.points}p ${p.threePointers ? `(${p.threePointers}x 3P)` : ''}`)
      .join('\n')

    return `🏀 *KORIPALLO OTTELURAPORTTI (Basket.fi)*
━━━━━━━━━━━━━━━━━━━━
🏆 *${match.competitionName}* (${match.categoryName})
🆚 *${match.homeTeamName}* ${match.scoreHome} – ${match.scoreAway} *${match.awayTeamName}*
📊 *Neljännekset:* ${qStr}
📍 *Pelipaikka:* ${match.venueName} (${match.date} klo ${match.time})

⭐ *PISTEPÖRSSI (TOP SCORERS):*
${topScorersStr}

⚠️ *JOUKKUEVIRHEET:*
• ${match.homeTeamName}: ${match.teamFoulsHome} / 5 virhettä
• ${match.awayTeamName}: ${match.teamFoulsAway} / 5 virhettä
━━━━━━━━━━━━━━━━━━━━
🔗 https://basketball-stats.pages.dev/match/${match.matchId}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMarkdown())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#5BC0BE]" />
          Jaa Otteluraportti (WhatsApp / Markdown)
        </h3>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3A506B] hover:bg-[#5BC0BE] hover:text-[#0B132B] transition-all text-xs font-semibold text-slate-100"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>Kopioitu!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Kopioi WhatsAppiin</span>
            </>
          )}
        </button>
      </div>

      <pre className="bg-[#0B132B] p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
        {generateMarkdown()}
      </pre>
    </div>
  )
}
