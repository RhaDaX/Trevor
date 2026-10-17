import { router } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'

const PRESETS = [
  { preset: '1h', label: '+1 h' },
  { preset: '3h', label: '+3 h' },
  { preset: 'tonight', label: 'Ce soir' },
  { preset: 'tomorrow', label: 'Demain' },
  { preset: 'monday', label: 'Lundi' },
]

export function snooze(taskId: number, preset: string) {
  router.post(`/tasks/${taskId}/snooze`, { preset }, { preserveScroll: true })
}

/** Boutons de report rapide : +1 h, demain, lundi */
export function SnoozeButtons({ taskId, compact = false }: { taskId: number; compact?: boolean }) {
  const presets = compact
    ? PRESETS.filter((p) => ['1h', 'tomorrow', 'monday'].includes(p.preset))
    : PRESETS
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((p) => (
        <button
          key={p.preset}
          type="button"
          onClick={() => snooze(taskId, p.preset)}
          className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 active:bg-stone-200"
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

export default function SnoozeMenu({ taskId }: { taskId: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Reporter"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .2.08.39.22.53l3 3a.75.75 0 1 0 1.06-1.06l-2.78-2.78V5Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
          {PRESETS.map((p) => (
            <button
              key={p.preset}
              type="button"
              onClick={() => {
                setOpen(false)
                snooze(taskId, p.preset)
              }}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-stone-100"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
