import { Head, Link, router, useForm, usePage } from '@inertiajs/react'
import { useState } from 'react'
import type { SharedProps, TaskDto } from '~/lib/types'
import { formatDateTime, formatSize, ORIGIN_LABELS, toLocalInput, useTimezone } from '~/lib/format'
import { SnoozeButtons } from '~/components/snooze_menu'
import CompanyBadge from '~/components/company_badge'
import ClientPicker from '~/components/client_picker'

const RECURRENCES = [
  { value: '', label: 'Aucune' },
  { value: 'FREQ=WEEKLY', label: 'Toutes les semaines' },
  { value: 'FREQ=MONTHLY', label: 'Tous les mois' },
  { value: 'FREQ=MONTHLY;INTERVAL=3', label: 'Tous les trimestres' },
  { value: 'FREQ=YEARLY', label: 'Tous les ans' },
]

const STATUS_LABELS = { inbox: 'À trier', todo: 'À faire', done: 'Fait', cancelled: 'Annulée' }

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

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    form.transform((data) => ({
      ...data,
      due_at: data.due_at || null,
      remind_at: data.remind_at || null,
      recurrence_rule: data.recurrence_rule || null,
      company: task.client ? null : data.company,
    }))
    form.put(`/tasks/${task.id}`, { preserveScroll: true })
  }

  return (
    <>
      <Head title={task.title} />
      <div className="mb-4 flex items-center gap-2 text-sm text-stone-500">
        <button type="button" onClick={() => history.back()} className="hover:text-stone-900">
          ← Retour
        </button>
        <span>·</span>
        <span>{STATUS_LABELS[task.status]}</span>
        <span>·</span>
        <span>{ORIGIN_LABELS[task.origin]}</span>
        {task.fromCrm && <span className="text-xs">(synchronisée depuis le CRM)</span>}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {open ? (
          <>
            <button
              type="button"
              onClick={() => router.post(`/tasks/${task.id}/complete`)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              ✓ Fait
            </button>
            <SnoozeButtons taskId={task.id} />
          </>
        ) : (
          <button
            type="button"
            onClick={() => router.post(`/tasks/${task.id}/reopen`)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold"
          >
            Rouvrir
          </button>
        )}
      </div>

      <form
        onSubmit={save}
        className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5"
      >
        <input
          value={form.data.title}
          onChange={(e) => form.setData('title', e.target.value)}
          className="w-full border-0 border-b border-transparent text-xl font-semibold outline-none focus:border-stone-300"
        />

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-500">Client :</span>
          {task.client ? (
            <>
              <Link
                href={`/clients/${task.client.id}`}
                className="inline-flex items-center gap-1 font-medium hover:underline"
              >
                <CompanyBadge company={task.client.company} /> {task.client.name}
              </Link>
              {task.client.crmUrl && (
                <a
                  href={task.client.crmUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Fiche CRM ↗
                </a>
              )}
              <button
                type="button"
                className="text-xs text-stone-400 hover:text-red-600"
                onClick={() =>
                  router.post(
                    `/tasks/${task.id}/client`,
                    { client_id: null },
                    { preserveScroll: true }
                  )
                }
              >
                détacher
              </button>
            </>
          ) : (
            <span className="text-stone-400">
              {task.clientUncertain ? 'incertain, à vérifier' : 'aucun'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setPickingClient((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {task.client ? 'changer' : 'rattacher'}
          </button>
        </div>
        {pickingClient && (
          <ClientPicker
            onPick={(c) => {
              setPickingClient(false)
              router.post(`/tasks/${task.id}/client`, { client_id: c.id }, { preserveScroll: true })
            }}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-stone-600">Échéance</span>
            <input
              type="datetime-local"
              value={form.data.due_at}
              onChange={(e) => form.setData('due_at', e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
            <label className="mt-1.5 flex items-center gap-2 text-xs text-stone-500">
              <input
                type="checkbox"
                checked={form.data.all_day}
                onChange={(e) => form.setData('all_day', e.target.checked)}
              />
              Journée entière
            </label>
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Rappel (si différent de l'échéance)</span>
            <input
              type="datetime-local"
              value={form.data.remind_at}
              onChange={(e) => form.setData('remind_at', e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
            {task.snoozedUntil && (
              <span className="mt-1.5 block text-xs text-amber-700">
                ⏱ Reportée au {formatDateTime(task.snoozedUntil, tz)}
              </span>
            )}
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Priorité</span>
            <select
              value={form.data.priority}
              onChange={(e) => form.setData('priority', e.target.value as TaskDto['priority'])}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Récurrence</span>
            <select
              value={form.data.recurrence_rule}
              onChange={(e) => form.setData('recurrence_rule', e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
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
              <span className="text-xs text-red-600">{String(errors.recurrence_rule)}</span>
            )}
          </label>
          {!task.client && (
            <label className="block text-sm">
              <span className="text-stone-600">Entreprise</span>
              <select
                value={form.data.company ?? ''}
                onChange={(e) =>
                  form.setData('company', (e.target.value || null) as TaskDto['company'])
                }
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              >
                <option value="">—</option>
                <option value="a">A</option>
                <option value="b">B</option>
              </select>
            </label>
          )}
        </div>

        <label className="block text-sm">
          <span className="text-stone-600">Notes</span>
          <textarea
            value={form.data.notes}
            onChange={(e) => form.setData('notes', e.target.value)}
            rows={8}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
          />
        </label>

        {task.attachments.length > 0 && (
          <div className="text-sm">
            <p className="mb-1 text-stone-600">Pièces jointes</p>
            <ul className="space-y-1">
              {task.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={`/tasks/${task.id}/attachments/${a.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    📎 {a.filename}
                  </a>
                  <span className="ml-2 text-xs text-stone-400">{formatSize(a.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => confirm('Supprimer cette tâche ?') && router.delete(`/tasks/${task.id}`)}
            className="text-sm text-red-600 hover:underline"
          >
            Supprimer
          </button>
          <button
            type="submit"
            disabled={form.processing || !form.isDirty}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Enregistrer
          </button>
        </div>
      </form>

      <p className="mt-3 text-xs text-stone-400">
        Créée le {formatDateTime(task.createdAt, tz)}
        {task.doneAt && ` · terminée le ${formatDateTime(task.doneAt, tz)}`}
      </p>
    </>
  )
}
