/** Anneau de progression de la journée */
export default function ProgressRing({ done, total }: { done: number; total: number }) {
  const ratio = total ? done / total : 0
  const r = 20
  const c = 2 * Math.PI * r
  const complete = total > 0 && done === total
  return (
    <div className="flex items-center gap-3" aria-label={`${done} sur ${total} faites aujourd'hui`}>
      <svg viewBox="0 0 48 48" className="size-12 -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={complete ? 'var(--done)' : 'var(--ink)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 600ms var(--ease-out-expo)' }}
        />
      </svg>
      <div className="text-right leading-tight">
        <p className="font-display text-xl font-semibold tabular">
          {done}
          <span className="text-ink-3">/{total}</span>
        </p>
        <p className="text-xs text-ink-3">{complete ? 'tout est fait' : 'faites'}</p>
      </div>
    </div>
  )
}
