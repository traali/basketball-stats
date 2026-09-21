export function CourtMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 3.5v25M3.5 16h25" stroke="currentColor" strokeWidth="1.35" />
      <path
        d="M7.2 7.2c5.6 3.6 11.9 3.6 17.6 0M7.2 24.8c5.6-3.6 11.9-3.6 17.6 0"
        stroke="currentColor"
        strokeWidth="1.35"
      />
    </svg>
  )
}
