import { router } from '@inertiajs/react'
import { AlarmClockPlus, CalendarArrowUp, Clock, Moon, Sunrise } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, Kbd, cx } from '~/components/ui'

export const SNOOZE_PRESETS = [
  { preset: '1h', label: '+1 h', icon: Clock, key: 'h' },
  { preset: '3h', label: '+3 h', icon: Clock, key: null },
  { preset: 'tonight', label: 'Ce soir', icon: Moon, key: null },
  { preset: 'tomorrow', label: 'Demain', icon: Sunrise, key: 'd' },
  { preset: 'monday', label: 'Lundi', icon: CalendarArrowUp, key: 'l' },
] as const

export function snooze(taskId: number, preset: string) {
  router.post(`/tasks/${taskId}/snooze`, { preset }, { preserveScroll: true })
}

/** Boutons de report rapide : +1 h, demain, lundi */
export function SnoozeButtons({ taskId, compact = false }: { taskId: number; compact?: boolean }) {
  const presets = compact
    ? SNOOZE_PRESETS.filter((p) => ['1h', 'tomorrow', 'monday'].includes(p.preset))
    : SNOOZE_PRESETS
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((p) => (
        <Button key={p.preset} size="sm" onClick={() => snooze(taskId, p.preset)}>
          <p.icon className="size-3.5 text-ink-3" strokeWidth={2} />
          {p.label}
        </Button>
      ))}
    </div>
  )
}

export default function SnoozeMenu({
  taskId,
  onSnooze,
}: {
  taskId: number
  onSnooze?: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Reporter"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'flex size-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink',
          open && 'bg-sunken text-ink'
        )}
      >
        <AlarmClockPlus className="size-[18px]" strokeWidth={1.75} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-48 origin-top-right animate-pop-in rounded-xl bg-surface p-1 shadow-lg ring-1 ring-line"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            Reporter à
          </p>
          {SNOOZE_PRESETS.map((p) => (
            <button
              key={p.preset}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onSnooze?.()
                snooze(taskId, p.preset)
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-ink hover:bg-sunken"
            >
              <p.icon className="size-4 text-ink-3" strokeWidth={1.75} />
              <span className="flex-1">{p.label}</span>
              {p.key && <Kbd>{p.key.toUpperCase()}</Kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
