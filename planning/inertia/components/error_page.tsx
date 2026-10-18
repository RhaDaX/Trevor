import { Head } from '@inertiajs/react'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export interface ErrorProps {
  code?: string
  message?: string
  status?: number
  traceId?: string
}

/** Page d'erreur : message clair, et la référence à communiquer pour retrouver les logs */
export default function ErrorPage({ title, error }: { title: string; error?: ErrorProps }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center">
      <Head title={title} />
      {error?.status && (
        <p className="font-display text-6xl font-semibold text-ink-3 tabular">{error.status}</p>
      )}
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
      {error?.message && <p className="mt-2 max-w-md text-[15px] text-ink-2">{error.message}</p>}

      {error?.traceId && (
        <div className="mt-6 rounded-2xl bg-surface p-4 text-left shadow-sm ring-1 ring-line">
          <p className="text-[13px] text-ink-3">Référence à communiquer si le problème persiste</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded-lg bg-sunken px-2.5 py-1.5 font-mono text-[15px] tracking-wide text-ink">
              {error.traceId}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(error.traceId!)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ring-1 ring-line-strong hover:bg-sunken"
            >
              {copied ? <Check className="size-4 text-done" /> : <Copy className="size-4" />}
              {copied ? 'Copiée' : 'Copier'}
            </button>
          </div>
          {error.code && <p className="mt-2 font-mono text-xs text-ink-3">{error.code}</p>}
        </div>
      )}

      <a
        href="/today"
        className="mt-8 text-sm font-medium text-ink underline underline-offset-4 hover:text-ink-2"
      >
        Retour à aujourd’hui
      </a>
    </div>
  )
}
