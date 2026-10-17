export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-display text-6xl font-semibold text-ink-3 tabular">404</p>
      <h1 className="font-display text-xl font-semibold">Cette page n’existe pas</h1>
      <a
        href="/today"
        className="text-sm font-medium text-ink underline underline-offset-4 hover:text-ink-2"
      >
        Retour à aujourd’hui
      </a>
    </div>
  )
}
