import { Head, useForm, usePage } from '@inertiajs/react'
import type { SharedProps } from '~/lib/types'

export default function Login() {
  const { flash } = usePage<SharedProps & Record<string, unknown>>().props
  const form = useForm({ email: '', password: '' })

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Head title="Connexion" />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.post('/login')
        }}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-bold">Planning</h1>
        {flash.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{flash.error}</p>
        )}
        <label className="block text-sm">
          <span className="text-stone-600">Email</span>
          <input
            type="email"
            autoComplete="username"
            value={form.data.email}
            onChange={(e) => form.setData('email', e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Mot de passe</span>
          <input
            type="password"
            autoComplete="current-password"
            value={form.data.password}
            onChange={(e) => form.setData('password', e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
            required
          />
        </label>
        <button
          type="submit"
          disabled={form.processing}
          className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Se connecter
        </button>
      </form>
    </div>
  )
}
