import { Users } from 'lucide-react'
import type { BasketRosterPlayer } from '../types/basketball'

function Card({ p, onPlayer }: { p: BasketRosterPlayer; onPlayer?: (playerId: string) => void }) {
  const clickable = Boolean(p.playerId && onPlayer)
  const hasStats = p.points !== null
  return (
    <button
      type="button"
      onClick={() => clickable && onPlayer?.(p.playerId)}
      disabled={!clickable}
      className="rounded-xl border border-hairline bg-canvas/80 px-3 py-2.5 text-left disabled:cursor-default hover:border-accent/40 min-h-11"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-semibold truncate ${clickable ? 'text-ice' : 'text-slate-100'}`}>
          {p.shirtNumber ? <span className="text-ice font-mono mr-1">#{p.shirtNumber}</span> : null}
          {p.fullName}
          {p.isCaptain ? <span className="ml-1 text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300">C</span> : null}
        </span>
        {hasStats ? (
          <span className="text-[11px] text-slate-300 tabular-nums whitespace-nowrap">
            <span className="font-semibold text-ice">{p.points}</span> p
            {p.threePointers !== null ? ` · ${p.threePointers}×3p` : ''}
            {p.fouls !== null ? ` · ${p.fouls} v` : ''}
          </span>
        ) : p.birthYear ? (
          <span className="text-[11px] text-slate-500">{p.birthYear}</span>
        ) : null}
      </div>
    </button>
  )
}

function Column({
  teamName,
  roster,
  emptyHint,
  onPlayer,
}: {
  teamName: string
  roster: BasketRosterPlayer[]
  emptyHint: string
  onPlayer?: (playerId: string) => void
}) {
  const rows = [...roster].sort(
    (a, b) => (b.points ?? -1) - (a.points ?? -1) || Number(a.shirtNumber || 999) - Number(b.shirtNumber || 999),
  )
  return (
    <div className="bg-court rounded-2xl p-4 border border-hairline">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-hairline">
        <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-accent shrink-0" />
          <span className="truncate">{teamName}</span>
        </h3>
        <span className="text-[11px] text-slate-400 shrink-0">{rows.length} pelaajaa</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">{emptyHint}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {rows.map((p) => (
            <Card key={p.playerId || p.fullName} p={p} onPlayer={onPlayer} />
          ))}
        </div>
      )}
    </div>
  )
}

export function BasketRosterCards({
  homeName,
  awayName,
  homeRoster,
  awayRoster,
  homeSeasonRoster = [],
  awaySeasonRoster = [],
  onPlayer,
}: {
  homeName: string
  awayName: string
  homeRoster: BasketRosterPlayer[]
  awayRoster: BasketRosterPlayer[]
  homeSeasonRoster?: BasketRosterPlayer[]
  awaySeasonRoster?: BasketRosterPlayer[]
  onPlayer?: (playerId: string) => void
}) {
  const hasMatchLineup = homeRoster.length > 0 || awayRoster.length > 0
  const hasSeason = homeSeasonRoster.length > 0 || awaySeasonRoster.length > 0
  return (
    <section className="space-y-3">
      <p className="text-xs text-slate-400">
        {hasMatchLineup
          ? 'Ottelun kokoonpano Basket.fi-pöytäkirjasta.'
          : 'Tälle ottelulle ei ole kokoonpanoa Basket.fi:ssä.'}
      </p>
      {hasMatchLineup ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Column teamName={homeName} roster={homeRoster} emptyHint="Ei kokoonpanoa." onPlayer={onPlayer} />
          <Column teamName={awayName} roster={awayRoster} emptyHint="Ei kokoonpanoa." onPlayer={onPlayer} />
        </div>
      ) : null}
      {hasSeason && !hasMatchLineup ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Joukkueiden pelaajalistat — ei tämän ottelun kokoonpano
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Column teamName={homeName} roster={homeSeasonRoster} emptyHint="Ei pelaajalistaa." onPlayer={onPlayer} />
            <Column teamName={awayName} roster={awaySeasonRoster} emptyHint="Ei pelaajalistaa." onPlayer={onPlayer} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
