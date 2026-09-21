import { Users } from 'lucide-react'
import type { BasketRosterPlayer } from '../types/basketball'

function Card({ p, onPlayer }: { p: BasketRosterPlayer; onPlayer?: (playerId: string) => void }) {
  const clickable = Boolean(p.playerId && onPlayer)
  return (
    <button
      type="button"
      onClick={() => clickable && onPlayer?.(p.playerId)}
      disabled={!clickable}
      className="rounded-xl border border-slate-800 bg-[#0B132B]/80 px-3 py-2.5 text-left disabled:cursor-default hover:border-[#5BC0BE]/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-bold truncate ${clickable ? 'text-[#6FFFE9]' : 'text-slate-100'}`}>
          {p.shirtNumber ? <span className="text-[#6FFFE9] font-mono mr-1">#{p.shirtNumber}</span> : null}
          {p.fullName}
        </span>
        {p.birthYear ? <span className="text-[11px] text-slate-500">{p.birthYear}</span> : null}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
        <div className="rounded-lg bg-[#1C2541] py-1">
          <div className="text-[9px] uppercase text-slate-500">PTS</div>
          <div className="text-sm font-black text-[#6FFFE9]">{p.points}</div>
        </div>
        <div className="rounded-lg bg-[#1C2541] py-1">
          <div className="text-[9px] uppercase text-slate-500">AST</div>
          <div className="text-sm font-black text-[#6FFFE9]">{p.assists}</div>
        </div>
        <div className="rounded-lg bg-[#1C2541] py-1">
          <div className="text-[9px] uppercase text-slate-500">PF</div>
          <div className="text-sm font-black text-white">{p.fouls}</div>
        </div>
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
  const rows = [...roster].sort((a, b) => b.points - a.points || b.assists - a.assists)
  return (
    <div className="bg-[#1C2541] rounded-2xl p-4 border border-slate-700/60">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/50">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#5BC0BE]" />
          {teamName}
        </h3>
        <span className="text-[11px] text-slate-400">{rows.length} pelaajaa</span>
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
  upcoming,
  onPlayer,
}: {
  homeName: string
  awayName: string
  homeRoster: BasketRosterPlayer[]
  awayRoster: BasketRosterPlayer[]
  homeSeasonRoster?: BasketRosterPlayer[]
  awaySeasonRoster?: BasketRosterPlayer[]
  upcoming?: boolean
  onPlayer?: (playerId: string) => void
}) {
  const hasMatchLineup = homeRoster.length > 0 || awayRoster.length > 0
  const hasSeason = homeSeasonRoster.length > 0 || awaySeasonRoster.length > 0
  return (
    <section className="space-y-3">
      <p className="text-xs text-slate-400">
        {hasMatchLineup
          ? upcoming
            ? 'Ennakko — TASOn julkaisema kokoonpano. PTS/AST/PF täyttyvät kun peli on käynnissä tai pelattu.'
            : 'Kokoonpano — pisteet, syötöt ja virheet tästä ottelusta (kun tilastoija on kirjannut).'
          : 'Tässä ottelussa ei ole kokoonpanoa. Junioreissa Basket.fi merkitsee usein “Ei pelaajia” — Pelipäivä silti yhdistää MyClub/Nimenhuuto-ajan TASO-kickoffiin joukkueen nimellä.'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Column
          teamName={homeName}
          roster={homeRoster}
          emptyHint="Ei tämän ottelun kokoonpanoa (juniorit / ei tilastoitu)."
          onPlayer={onPlayer}
        />
        <Column
          teamName={awayName}
          roster={awayRoster}
          emptyHint="Ei tämän ottelun kokoonpanoa (juniorit / ei tilastoitu)."
          onPlayer={onPlayer}
        />
      </div>
      {hasSeason && !hasMatchLineup ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Joukkueen kausilista — ei vahvistettu tähän peliin
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Column teamName={homeName} roster={homeSeasonRoster} emptyHint="Ei kausilistaa." onPlayer={onPlayer} />
            <Column teamName={awayName} roster={awaySeasonRoster} emptyHint="Ei kausilistaa." onPlayer={onPlayer} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
