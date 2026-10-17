import { router } from '@inertiajs/react'
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Circle,
  CornerDownLeft,
  Flame,
  Inbox,
  Plus,
  Repeat2,
  Search,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ClientDto, TaskDto } from '~/lib/types'
import { formatDue, useTimezone } from '~/lib/format'
import { CompanyDot, Kbd, cx } from '~/components/ui'

interface Preview {
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
}

interface SearchResult {
  clients: ClientDto[]
  tasks: TaskDto[]
  preview: Preview | null
}

type Item =
  { kind: 'create' } | { kind: 'task'; task: TaskDto } | { kind: 'client'; client: ClientDto }

export const FOCUS_CAPTURE_EVENT = 'planning:focus-capture'

const EXAMPLES = [
  'rappeler Dupont jeudi 14h #urgent',
  'envoyer devis demain #b',
  'payer hébergement tous les mois le 5',
]

function Chip({
  tone = 'default',
  children,
}: {
  tone?: 'default' | 'signal' | 'amber' | 'focus'
  children: React.ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium',
        tone === 'signal' && 'bg-signal-soft text-signal',
        tone === 'amber' && 'bg-amber-soft text-amber-ink',
        tone === 'focus' && 'bg-co-a-soft text-co-a',
        tone === 'default' && 'bg-sunken text-ink-2 ring-1 ring-inset ring-line'
      )}
    >
      {children}
    </span>
  )
}

/**
 * Barre de capture en haut de chaque page (⌘K) : recherche et création au
 * même endroit, avec l'interprétation de la saisie avant validation.
 */
export default function QuickCapture() {
  const tz = useTimezone()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [active, setActive] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const focus = () => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        focus()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(FOCUS_CAPTURE_EVENT, focus)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(FOCUS_CAPTURE_EVENT, focus)
    }
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
    }, 120)
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
      if (text) setText('')
      else inputRef.current?.blur()
    }
  }

  const preview = result?.preview
  const open = focused
  const hasResults = (result?.tasks.length ?? 0) + (result?.clients.length ?? 0) > 0

  return (
    <div className="relative w-full">
      <div
        className={cx(
          'flex h-11 items-center gap-2.5 rounded-xl bg-surface px-3.5 ring-1 ring-line-strong transition-all duration-150',
          focused ? 'shadow-md ring-2 ring-ink/80' : 'shadow-sm hover:ring-ink-3'
        )}
      >
        {saving ? (
          <span
            className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-ink"
            aria-hidden
          />
        ) : (
          <Plus className="size-[18px] shrink-0 text-ink-3" strokeWidth={2} aria-hidden />
        )}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Nouvelle tâche ou recherche…"
          aria-label="Nouvelle tâche ou recherche"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-activedescendant={items.length ? `${listId}-${active}` : undefined}
          className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
        />
        <span className="hidden sm:contents">
          <Kbd>⌘K</Kbd>
        </span>
      </div>

      {open && (
        <div className="absolute inset-x-0 z-40 mt-2 origin-top animate-pop-in overflow-hidden rounded-2xl bg-surface shadow-lg ring-1 ring-line">
          {!text.trim() ? (
            <div className="p-4">
              <p className="mb-3 text-[13px] font-medium text-ink-2">
                Tapez en langage naturel, Entrée pour créer.
              </p>
              <ul className="space-y-1">
                {EXAMPLES.map((ex) => (
                  <li key={ex}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setText(ex)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink-2 hover:bg-sunken hover:text-ink"
                    >
                      <ArrowRight className="size-3.5 text-ink-3" />
                      {ex}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-3">
                <span className="font-medium text-ink-2">#urgent</span> priorité haute ·{' '}
                <span className="font-medium text-ink-2">#a #b</span> entreprise · sans date → à
                trier
              </p>
            </div>
          ) : (
            <ul
              id={listId}
              role="listbox"
              className="max-h-[min(60vh,480px)] overflow-y-auto p-1.5"
            >
              {items.map((item, i) => {
                const isActive = i === active
                const key =
                  item.kind === 'create'
                    ? 'create'
                    : `${item.kind}-${item.kind === 'task' ? item.task.id : item.client.id}`
                return (
                  <li key={key} id={`${listId}-${i}`} role="option" aria-selected={isActive}>
                    {item.kind === 'task' && i === 1 && (
                      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                        Tâches
                      </p>
                    )}
                    {item.kind === 'client' && items[i - 1]?.kind !== 'client' && (
                      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                        Clients
                      </p>
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(item)}
                      onMouseEnter={() => setActive(i)}
                      className={cx(
                        'flex w-full items-start gap-3 rounded-xl px-3 text-left transition-colors',
                        item.kind === 'create' ? 'py-3' : 'py-2',
                        isActive ? 'bg-sunken' : ''
                      )}
                    >
                      {item.kind === 'create' && (
                        <>
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink text-ink-inverse">
                            <Plus className="size-4" strokeWidth={2.25} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium text-ink">
                              {preview?.title ?? text.trim()}
                            </span>
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              {preview?.dueAt ? (
                                <Chip>
                                  <CalendarDays className="size-3.5" />
                                  {formatDue(preview.dueAt, preview.allDay, tz)}
                                </Chip>
                              ) : (
                                <Chip tone="amber">
                                  <Inbox className="size-3.5" />À trier — pas de date
                                </Chip>
                              )}
                              {preview?.client && (
                                <Chip>
                                  <CompanyDot company={preview.client.company} />
                                  {preview.client.name}
                                </Chip>
                              )}
                              {!preview?.client && preview?.clientUncertain && (
                                <Chip tone="amber">
                                  <TriangleAlert className="size-3.5" />
                                  Client incertain
                                </Chip>
                              )}
                              {!preview?.client && preview?.company && (
                                <Chip>
                                  <CompanyDot company={preview.company} />
                                  Entreprise {preview.company.toUpperCase()}
                                </Chip>
                              )}
                              {preview?.priority === 'high' && (
                                <Chip tone="signal">
                                  <Flame className="size-3.5" />
                                  Urgent
                                </Chip>
                              )}
                              {preview?.recurrenceRule && (
                                <Chip>
                                  <Repeat2 className="size-3.5" />
                                  Récurrente
                                </Chip>
                              )}
                            </span>
                          </span>
                          <CornerDownLeft
                            className={cx(
                              'mt-1.5 size-4 shrink-0',
                              isActive ? 'text-ink-2' : 'text-transparent'
                            )}
                          />
                        </>
                      )}
                      {item.kind === 'task' && (
                        <>
                          {item.task.status === 'done' ? (
                            <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-done" />
                          ) : (
                            <Circle className="mt-0.5 size-[18px] shrink-0 text-ink-3" />
                          )}
                          <span className="min-w-0 flex-1 text-sm">
                            <span
                              className={cx(
                                'block truncate',
                                item.task.status === 'done' ? 'text-ink-3 line-through' : 'text-ink'
                              )}
                            >
                              {item.task.title}
                            </span>
                            {item.task.client && (
                              <span className="text-xs text-ink-3">{item.task.client.name}</span>
                            )}
                          </span>
                        </>
                      )}
                      {item.kind === 'client' && (
                        <>
                          <UserRound className="mt-0.5 size-[18px] shrink-0 text-ink-3" />
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="flex items-center gap-1.5 text-ink">
                              <CompanyDot company={item.client.company} />
                              <span className="truncate">{item.client.name}</span>
                            </span>
                            {item.client.emails[0] && (
                              <span className="text-xs text-ink-3">{item.client.emails[0]}</span>
                            )}
                          </span>
                        </>
                      )}
                    </button>
                  </li>
                )
              })}
              {!hasResults && result && (
                <li className="flex items-center gap-2 px-3 py-2 text-xs text-ink-3">
                  <Search className="size-3.5" /> Aucune tâche ni client correspondant
                </li>
              )}
            </ul>
          )}
          <div className="hidden items-center gap-4 border-t border-line bg-sunken/60 px-4 py-2 text-xs text-ink-3 sm:flex">
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> créer / ouvrir
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> naviguer
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>esc</Kbd> fermer
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
