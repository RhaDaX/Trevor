export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-bold">Page introuvable</h1>
      <a href="/today" className="text-sm text-blue-600 hover:underline">
        Retour au planning
      </a>
    </div>
  )
}
