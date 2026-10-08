import { ExternalLink } from 'lucide-react'

/** Small secondary link to the exact page on tulospalvelu.basket.fi. Renders nothing without a URL. */
export function FederationLink({ href, label = 'Basket.fi-tulospalvelussa' }: { href?: string; label?: string }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-ice underline-offset-2 hover:underline min-h-8"
    >
      {label}
      <ExternalLink className="w-3 h-3" aria-hidden />
    </a>
  )
}
