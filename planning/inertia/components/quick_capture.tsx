import { router } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'
import type { ClientDto, TaskDto } from '~/lib/types'
import { formatDue, useTimezone } from '~/lib/format'
import CompanyBadge from '~/components/company_badge'

interface SearchResult {
  clients: ClientDto[]
  tasks: TaskDto[]
  preview: {
    title: string
    dueAt: string | null
    allDay: boolean
    priority: 'low' | 'normal' | 'high'
    company: 'a' | 'b' | null
    recurrenceRule: string | null
    dateText: string | null
    client: ClientDto | null
    clientUncertain: boolean
    goesToInbox: boolean
  } | null
}

type Item =
  { kind: 'create' } | { kind: 'task'; task: TaskDto } | { kind: 'client'; client: ClientDto }

/**
 * Champ de saisie rapide en haut de chaque page (Cmd+K) :
 * recherche et création au même endroit, Entrée pour créer.
 */
export default function QuickCapture() {
  const tz = useTimezone()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [active, setActive] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const q = text.trim()
    if (!q) {
      setResult(null)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/search?q=${encodeURIComponent(q)}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        if (res.ok) setResult(await res.json())
      } catch {}
    }, 150)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text])

  const items: Item[] = text.trim()
    ? [
        { kind: 'create' },
        ...(result?.tasks ?? []).map((task) => ({ kind: 'task' as const, task })),
        ...(result?.clients ?? []).map((client) => ({ kind: 'client' as const, client })),
      ]
    : []

  useEffect(() => setActive(0), [result])

  const create = () => {
    const value = text.trim()
    if (!value || saving) return
    setSaving(true)
    router.post(
      '/tasks',
      { text: value },
      {
        preserveScroll: true,
        onSuccess: () => {
          setText('')
          setResult(null)
        },
        onFinish: () => setSaving(false),
      }
    )
  }

  const choose = (item: Item) => {
    if (item.kind === 'create') return create()
    setText('')
    inputRef.current?.blur()
    router.visit(item.kind === 'task' ? `/tasks/${item.task.id}` : `/clients/${item.client.id}`)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[active]
      if (item) choose(item)
    } else if (e.key === 'Escape') {
      setText('')
      inputRef.current?.blur()
    }
  }

  const preview = result?.preview
  const open = focused && items.length > 0

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 shadow-sm focus-within:border-stone-500 focus-within:ring-2 focus-within:ring-stone-200">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-stone-400">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Rappeler Dupont jeudi 14h #urgent"
          className="h-11 w-full bg-transparent outline-none placeholder:text-stone-400"
          autoComplete="off"
          enterKeyHint="done"
        />
        <kbd className="hidden shrink-0 rounded border border-stone-200 px-1.5 text-[11px] text-stone-400 sm:block">
          ⌘K
        </kbd>
      </div>

      {open && (
        <div className="absolute inset-x-0 z-30 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {items.map((item, i) => (
              <li
                key={
                  item.kind === 'create'
                    ? 'create'
                    : `${item.kind}-${item.kind === 'task' ? item.task.id : item.client.id}`
                }
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(item)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-start gap-3 px-3 py-2 text-left text-sm ${i === active ? 'bg-stone-100' : ''}`}
                >
                  {item.kind === 'create' && (
                    <>
                      <span className="mt-0.5 text-stone-400">＋</span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">
                          Créer « {preview?.title ?? text.trim()} »
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-stone-500">
                          {preview?.dueAt ? (
                            <span className="text-blue-700">
                              📅 {formatDue(preview.dueAt, preview.allDay, tz)}
                            </span>
                          ) : (
                            <span className="text-amber-600">→ à trier (pas de date)</span>
                          )}
                          {preview?.client && (
                            <span className="inline-flex items-center gap-1">
                              <CompanyBadge company={preview.client.company} />{' '}
                              {preview.client.name}
                            </span>
                          )}
                          {!preview?.client && preview?.clientUncertain && (
                            <span className="text-amber-600">client incertain → à trier</span>
                          )}
                          {preview?.priority === 'high' && (
                            <span className="text-red-600">priorité haute</span>
                          )}
                          {preview?.recurrenceRule && <span>↻ récurrente</span>}
                          {!preview?.client && preview?.company && (
                            <CompanyBadge company={preview.company} />
                          )}
                        </span>
                      </span>
                      <span className="text-xs text-stone-400">↵</span>
                    </>
                  )}
                  {item.kind === 'task' && (
                    <>
                      <span className="mt-0.5 text-stone-400">
                        {item.task.status === 'done' ? '✓' : '○'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={
                            item.task.status === 'done' ? 'text-stone-400 line-through' : ''
                          }
                        >
                          {item.task.title}
                        </span>
                        {item.task.client && (
                          <span className="ml-2 text-xs text-stone-500">
                            {item.task.client.name}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                  {item.kind === 'client' && (
                    <>
                      <CompanyBadge company={item.client.company} />
                      <span className="min-w-0 flex-1">
                        {item.client.name}
                        <span className="ml-2 text-xs text-stone-500">{item.client.emails[0]}</span>
                      </span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
