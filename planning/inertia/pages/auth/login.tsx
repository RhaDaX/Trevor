import { Head, useForm, usePage } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'
import type { SharedProps } from '~/lib/types'
import { Button, Field, inputClass } from '~/components/ui'

export default function Login() {
  const { flash } = usePage<SharedProps & Record<string, unknown>>().props
  const form = useForm({ email: '', password: '' })

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Head title="Connexion" />
      <div className="w-full max-w-[360px] animate-rise">
        <img src="/icons/icon.svg" alt="" className="mb-8 size-11 rounded-xl shadow-md" />
        <h1 className="font-display text-[30px] leading-tight font-semibold tracking-[-0.02em]">
          Bon retour.
        </h1>
        <p className="mt-2 mb-8 text-[15px] text-ink-2">Plus rien ne tombe entre les mailles.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.post('/login')
          }}
          className="space-y-4"
        >
          {flash.error && (
            <p role="alert" className="rounded-xl bg-signal-soft px-3.5 py-2.5 text-sm text-signal">
              {flash.error}
            </p>
          )}
          <Field label="Email">
            <input
              type="email"
              autoComplete="username"
              autoFocus
              value={form.data.email}
              onChange={(e) => form.setData('email', e.target.value)}
              className={inputClass + ' h-11'}
              required
            />
          </Field>
          <Field label="Mot de passe">
            <input
              type="password"
              autoComplete="current-password"
              value={form.data.password}
              onChange={(e) => form.setData('password', e.target.value)}
              className={inputClass + ' h-11'}
              required
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            disabled={form.processing}
            className="h-11 w-full"
          >
            Se connecter
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
