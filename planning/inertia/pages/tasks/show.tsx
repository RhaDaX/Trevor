import { Head, Link, router, useForm, usePage } from '@inertiajs/react'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ExternalLink,
  FileText,
  Flag,
  Hourglass,
  Paperclip,
  Repeat2,
  RotateCcw,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { SharedProps, TaskDto } from '~/lib/types'
import { formatDateTime, formatSize, ORIGIN_LABELS, toLocalInput, useTimezone } from '~/lib/format'
import { SnoozeButtons } from '~/components/snooze_menu'
import ClientPicker from '~/components/client_picker'
import { Button, Card, CompanyDot, Kbd, Segmented, cx, inputClass } from '~/components/ui'

const RECURRENCES = [
  { value: '', label: 'Aucune' },
  { value: 'FREQ=WEEKLY', label: 'Toutes les semaines' },
  { value: 'FREQ=MONTHLY', label: 'Tous les mois' },
  { value: 'FREQ=MONTHLY;INTERVAL=3', label: 'Tous les trimestres' },
  { value: 'FREQ=YEARLY', label: 'Tous les ans' },
]

const STATUS = {
  inbox: { label: 'À trier', cls: 'bg-amber-soft text-amber-ink' },
  todo: { label: 'À faire', cls: 'bg-sunken text-ink-2 ring-1 ring-inset ring-line' },
  done: { label: 'Faite', cls: 'bg-done-soft text-done' },
  cancelled: { label: 'Annulée', cls: 'bg-sunken text-ink-3' },
}

function Property({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Flag
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[132px_1fr] items-start gap-3 py-3 first:pt-0 last:pb-0 max-sm:grid-cols-1 max-sm:gap-1.5">
      <span className="flex items-center gap-2 pt-2 text-[13px] text-ink-3 max-sm:pt-0">
        <Icon className="size-4" strokeWidth={1.75} />
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export default function ShowTask({ task }: { task: TaskDto }) {
  const tz = useTimezone()
  const errors = usePage<SharedProps & Record<string, unknown>>().props.errors ?? {}
  const [pickingClient, setPickingClient] = useState(false)
  const form = useForm({
    title: task.title,
    notes: task.notes ?? '',
    due_at: toLocalInput(task.dueAt, tz),
    remind_at: toLocalInput(task.remindAt, tz),
    all_day: task.allDay,
    priority: task.priority,
    company: task.company,
    recurrence_rule: task.recurrenceRule ?? '',
  })
  const open = task.status === 'inbox' || task.status === 'todo'
  const knownRule = RECURRENCES.some((r) => r.value === form.data.recurrence_rule)

  const save = () => {
    form.transform((data) => ({
      ...data,
      due_at: data.due_at || null,
      remind_at: data.remind_at || null,
      recurrence_rule: data.recurrence_rule || null,
      company: task.client ? null : data.company,
    }))
    form.put(`/tasks/${task.id}`, { preserveScroll: true })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && form.isDirty) {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <Head title={task.title} />
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => history.back()}
          className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-ink-2 hover:bg-sunken hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Retour
        </button>
        <div className="flex items-center gap-2 text-[13px] text-ink-3">
          <span
            className={cx('rounded-md px-2 py-0.5 text-xs font-semibold', STATUS[task.status].cls)}
          >
            {STATUS[task.status].label}
          </span>
          via {ORIGIN_LABELS[task.origin]}
          {task.fromCrm && ' · synchronisée'}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <textarea
          value={form.data.title}
          onChange={(e) => form.setData('title', e.target.value.replace(/\n/g, ' '))}
          rows={1}
          aria-label="Titre"
          className="field-sizing-content w-full resize-none bg-transparent font-display text-[26px] leading-[1.2] font-semibold tracking-[-0.015em] text-ink outline-none focus-visible:outline-none sm:text-[30px]"
        />

        <div className="mt-5 mb-8 flex flex-wrap items-center gap-2">
          {open ? (
            <>
              <Button variant="success" onClick={() => router.post(`/tasks/${task.id}/complete`)}>
                <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
                  <path
                    d="M3.5 8.5l3 3 6-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Marquer comme faite
              </Button>
              <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
              <SnoozeButtons taskId={task.id} />
            </>
          ) : (
            <Button onClick={() => router.post(`/tasks/${task.id}/reopen`)}>
              <RotateCcw className="size-4" /> Rouvrir
            </Button>
          )}
        </div>

        <Card className="p-5">
          <Property icon={UserRound} label="Client">
            <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
              {task.client ? (
                <>
                  <Link
                    href={`/clients/${task.client.id}`}
                    className="inline-flex items-center gap-2 font-medium text-ink hover:underline hover:underline-offset-2"
                  >
                    <CompanyDot company={task.client.company} /> {task.client.name}
                  </Link>
                  {task.client.crmUrl && (
                    <a
                      href={task.client.crmUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[13px] text-co-a hover:underline"
                    >
                      Fiche CRM <ExternalLink className="size-3" />
                    </a>
                  )}
                </>
              ) : (
                <span className={task.clientUncertain ? 'text-amber-ink' : 'text-ink-3'}>
                  {task.clientUncertain ? 'Incertain, à vérifier' : 'Aucun'}
                </span>
              )}
              <Button size="sm" variant="ghost" onClick={() => setPickingClient((v) => !v)}>
                {task.client ? 'Changer' : 'Rattacher'}
              </Button>
              {task.client && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    router.post(
                      `/tasks/${task.id}/client`,
                      { client_id: null },
                      { preserveScroll: true }
                    )
                  }
                >
                  Détacher
                </Button>
              )}
            </div>
            {pickingClient && (
              <div className="mt-2">
                <ClientPicker
                  onPick={(c) => {
                    setPickingClient(false)
                    router.post(
                      `/tasks/${task.id}/client`,
                      { client_id: c.id },
                      { preserveScroll: true }
                    )
                  }}
                />
              </div>
            )}
          </Property>

          <div className="divide-y divide-line border-t border-line">
            <Property icon={CalendarClock} label="Échéance">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="datetime-local"
                  value={form.data.due_at}
                  onChange={(e) => form.setData('due_at', e.target.value)}
                  aria-label="Échéance"
                  className={inputClass + ' h-9 max-w-[260px] py-1.5'}
                />
                <label className="inline-flex items-center gap-2 text-[13px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={form.data.all_day}
                    onChange={(e) => form.setData('all_day', e.target.checked)}
                    className="size-4 rounded accent-[var(--ink)]"
                  />
                  Journée entière
                </label>
              </div>
            </Property>
            <Property icon={Hourglass} label="Rappel">
              <input
                type="datetime-local"
                value={form.data.remind_at}
                onChange={(e) => form.setData('remind_at', e.target.value)}
                aria-label="Rappel"
                className={inputClass + ' h-9 max-w-[260px] py-1.5'}
              />
              <p className="mt-1.5 text-xs text-ink-3">
                {task.snoozedUntil
                  ? `Reportée au ${formatDateTime(task.snoozedUntil, tz)}`
                  : 'Vide : la tâche sonne à l’échéance.'}
              </p>
            </Property>
            <Property icon={Flag} label="Priorité">
              <Segmented
                label="Priorité"
                value={form.data.priority}
                onChange={(v) => form.setData('priority', v)}
                options={[
                  { value: 'low', label: 'Basse' },
                  { value: 'normal', label: 'Normale' },
                  {
                    value: 'high',
                    label: (
                      <span className={form.data.priority === 'high' ? 'text-signal' : ''}>
                        Urgente
                      </span>
                    ),
                  },
                ]}
              />
            </Property>
            <Property icon={Repeat2} label="Récurrence">
              <select
                value={form.data.recurrence_rule}
                onChange={(e) => form.setData('recurrence_rule', e.target.value)}
                aria-label="Récurrence"
                className={inputClass + ' h-9 max-w-[260px] py-1.5 pr-8'}
              >
                {!knownRule && (
                  <option value={form.data.recurrence_rule}>{form.data.recurrence_rule}</option>
                )}
                {RECURRENCES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {errors.recurrence_rule && (
                <p className="mt-1.5 text-xs text-signal">{String(errors.recurrence_rule)}</p>
              )}
            </Property>
            {!task.client && (
              <Property icon={Building2} label="Entreprise">
                <Segmented
                  label="Entreprise"
                  value={form.data.company ?? 'none'}
                  onChange={(v) => form.setData('company', v === 'none' ? null : (v as 'a' | 'b'))}
                  options={[
                    { value: 'none', label: '—' },
                    {
                      value: 'a',
                      label: (
                        <>
                          <CompanyDot company="a" /> A
                        </>
                      ),
                    },
                    {
                      value: 'b',
                      label: (
                        <>
                          <CompanyDot company="b" /> B
                        </>
                      ),
                    },
                  ]}
                />
              </Property>
            )}
            <Property icon={FileText} label="Notes">
              <textarea
                value={form.data.notes}
                onChange={(e) => form.setData('notes', e.target.value)}
                rows={6}
                aria-label="Notes"
                placeholder="Contexte, numéro, ce qui a été dit…"
                className={
                  inputClass + ' field-sizing-content min-h-28 text-[14px] leading-relaxed'
                }
              />
            </Property>
            {task.attachments.length > 0 && (
              <Property icon={Paperclip} label="Pièces jointes">
                <ul className="space-y-1 pt-1.5">
                  {task.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/tasks/${task.id}/attachments/${a.id}`}
                        className="inline-flex items-center gap-2 text-sm text-ink hover:underline hover:underline-offset-2"
                      >
                        <Paperclip className="size-3.5 text-ink-3" />
                        {a.filename}
                        <span className="text-xs text-ink-3 tabular">{formatSize(a.size)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Property>
            )}
          </div>
        </Card>

        <div className="mt-4 flex items-center justify-between px-1 text-xs text-ink-3">
          <span className="tabular">
            Créée le {formatDateTime(task.createdAt, tz)}
            {task.doneAt && ` · faite le ${formatDateTime(task.doneAt, tz)}`}
          </span>
          <Button
            size="sm"
            variant="danger"
            onClick={() => confirm('Supprimer cette tâche ?') && router.delete(`/tasks/${task.id}`)}
          >
            <Trash2 className="size-3.5" /> Supprimer
          </Button>
        </div>

        {/* Barre d'enregistrement : n'apparaît que s'il y a des changements */}
        <div
          className={cx(
            'fixed inset-x-0 bottom-[84px] z-40 flex justify-center px-4 transition-all duration-200 ease-out-quart md:bottom-6 md:pl-60',
            form.isDirty
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-3 opacity-0'
          )}
        >
          <div className="flex items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-sm text-ink-inverse shadow-lg">
            Modifications non enregistrées
            <button
              type="button"
              onClick={() => form.reset()}
              className="h-8 rounded-lg px-2.5 opacity-70 hover:bg-white/10 hover:opacity-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={form.processing}
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-ink-inverse px-3 font-semibold text-ink"
            >
              Enregistrer{' '}
              <span className="hidden sm:contents">
                <Kbd>⌘↵</Kbd>
              </span>
            </button>
          </div>
        </div>
      </form>
    </>
  )
}
