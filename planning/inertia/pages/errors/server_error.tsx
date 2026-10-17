export default function ServerError({ error }: { error: { message: string } }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-bold">Une erreur est survenue</h1>
      <p className="text-sm text-stone-500">{error?.message}</p>
      <a href="/today" className="text-sm text-blue-600 hover:underline">
        Retour au planning
      </a>
    </div>
  )
}
