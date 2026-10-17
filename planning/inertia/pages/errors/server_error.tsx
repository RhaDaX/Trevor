export default function ServerError({ error }: { error: { message: string } }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-display text-xl font-semibold">Quelque chose s’est mal passé</h1>
      <p className="max-w-md text-sm text-ink-2">{error?.message}</p>
      <a
        href="/today"
        className="text-sm font-medium text-ink underline underline-offset-4 hover:text-ink-2"
      >
        Retour à aujourd’hui
      </a>
    </div>
  )
}
