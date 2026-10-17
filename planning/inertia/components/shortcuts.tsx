import { router } from '@inertiajs/react'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FOCUS_CAPTURE_EVENT } from '~/components/quick_capture'
import { snooze } from '~/components/snooze_menu'
import { Kbd } from '~/components/ui'

const GROUPS = [
  {
    title: 'Partout',
    items: [
      [['⌘', 'K'], 'Capturer ou chercher'],
      [['N'], 'Nouvelle tâche'],
      [['?'], 'Afficher les raccourcis'],
    ],
  },
  {
    title: 'Sur une tâche',
    items: [
      [['J'], 'Suivante'],
      [['K'], 'Précédente'],
      [['↵'], 'Ouvrir'],
      [['X'], 'Marquer comme faite'],
      [['H'], 'Reporter d’une heure'],
      [['D'], 'Reporter à demain'],
      [['L'], 'Reporter à lundi'],
    ],
  },
  {
    title: 'Aller à',
    items: [
      [['G', 'T'], "Aujourd'hui"],
      [['G', 'I'], 'À trier'],
      [['G', 'A'], 'À venir'],
      [['G', 'C'], 'Clients'],
    ],
  },
] as const

const GO: Record<string, string> = {
  t: '/today',
  i: '/inbox',
  a: '/upcoming',
  c: '/clients',
  r: '/settings',
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return Boolean(el?.closest('input, textarea, select, [contenteditable="true"]'))
}

function rows() {
  return [...document.querySelectorAll<HTMLElement>('[data-task-id]')]
}

/**
 * Navigation clavier façon outil pro : J/K pour parcourir, X pour cocher,
 * H/D/L pour reporter, G puis une lettre pour changer de vue.
 */
export default function Shortcuts() {
  const [help, setHelp] = useState(false)
  const pendingG = useRef(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const key = e.key.toLowerCase()

      if (pendingG.current) {
        pendingG.current = false
        if (GO[key]) {
          e.preventDefault()
          router.visit(GO[key])
        }
        return
      }
      if (key === 'g') {
        pendingG.current = true
        setTimeout(() => (pendingG.current = false), 900)
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        setHelp((v) => !v)
        return
      }
      if (key === 'escape') return setHelp(false)
      if (key === 'n') {
        e.preventDefault()
        window.dispatchEvent(new Event(FOCUS_CAPTURE_EVENT))
        return
      }

      const list = rows()
      if (!list.length) return
      const current = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(
        '[data-task-id]'
      )
      const index = current ? list.indexOf(current) : -1

      if (key === 'j' || key === 'arrowdown') {
        e.preventDefault()
        list[Math.min(index + 1, list.length - 1)]?.focus()
      } else if (key === 'k' || key === 'arrowup') {
        e.preventDefault()
        list[Math.max(index - 1, 0)]?.focus()
      } else if (current) {
        const id = Number(current.dataset.taskId)
        if (key === 'enter') {
          e.preventDefault()
          current.querySelector<HTMLElement>('[data-open]')?.click()
        } else if (key === 'x') {
          e.preventDefault()
          // Garde le focus sur la ligne suivante
          const next = list[index + 1] ?? list[index - 1]
          current.querySelector<HTMLElement>('[data-check]')?.click()
          setTimeout(() => next?.focus(), 700)
        } else if (key === 'h' || key === 'd' || key === 'l') {
          e.preventDefault()
          snooze(id, { h: '1h', d: 'tomorrow', l: 'monday' }[key])
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!help) return null
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade items-center justify-center bg-ink/25 p-4 backdrop-blur-[2px]"
      onClick={() => setHelp(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Raccourcis clavier"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-pop-in rounded-2xl bg-surface p-6 shadow-lg ring-1 ring-line"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Raccourcis clavier</h2>
          <button
            type="button"
            onClick={() => setHelp(false)}
            aria-label="Fermer"
            className="flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title} className={g.title === 'Sur une tâche' ? 'sm:row-span-2' : ''}>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                {g.title}
              </p>
              <ul className="space-y-1.5">
                {g.items.map(([keys, label]) => (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-3 text-sm text-ink-2"
                  >
                    {label}
                    <span className="flex gap-1">
                      {keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
