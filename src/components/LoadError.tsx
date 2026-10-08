import { AlertTriangle } from 'lucide-react'

/** Shown when a Basket.fi call failed. Never confused with "no games". */
export function LoadError({ what, onRetry }: { what: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-800/60 bg-rose-950/30 p-4 space-y-2">
      <p className="text-sm font-semibold text-rose-200 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Haku epäonnistui
      </p>
      <p className="text-xs text-rose-200/80">
        {what} ei saatu Basket.fi:stä juuri nyt. Tämä ei tarkoita, ettei otteluita olisi.
      </p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-ice">
          Yritä uudelleen
        </button>
      ) : null}
    </div>
  )
}
