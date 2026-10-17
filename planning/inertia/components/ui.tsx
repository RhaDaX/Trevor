import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Company } from '~/lib/types'

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-ink-inverse shadow-sm hover:bg-ink/88 active:bg-ink/80',
  secondary:
    'bg-surface text-ink ring-1 ring-inset ring-line-strong shadow-sm hover:bg-sunken active:bg-line/60',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink active:bg-line/60',
  danger: 'text-signal hover:bg-signal-soft active:bg-signal-soft',
  success: 'bg-done text-white shadow-sm hover:bg-done/90 active:bg-done/85',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-[13px]',
  md: 'h-10 gap-2 rounded-[10px] px-3.5 text-sm',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 select-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {children}
    </button>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong bg-surface px-1 font-sans text-[11px] font-medium text-ink-3 shadow-[0_1px_0_var(--line-strong)]',
        className
      )}
    >
      {children}
    </kbd>
  )
}

export function CompanyBadge({ company, label }: { company: Company | null; label?: string }) {
  if (!company) return null
  return (
    <span
      className={cx(
        'inline-flex h-[18px] items-center rounded-[5px] px-1.5 text-[11px] leading-none font-semibold tracking-wide',
        company === 'a' ? 'bg-co-a-soft text-co-a' : 'bg-co-b-soft text-co-b'
      )}
    >
      {label ?? company.toUpperCase()}
    </span>
  )
}

export function CompanyDot({ company }: { company: Company | null }) {
  if (!company) return null
  return (
    <span
      aria-hidden
      className={cx('inline-block size-1.5 rounded-full', company === 'a' ? 'bg-co-a' : 'bg-co-b')}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-2xl bg-surface shadow-sm ring-1 ring-line', className)}>
      {children}
    </div>
  )
}

export const inputClass =
  'block w-full rounded-[10px] bg-surface px-3 py-2 text-ink ring-1 ring-inset ring-line-strong placeholder:text-ink-3 transition-shadow focus:ring-2 focus:ring-focus focus:outline-none'

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  error?: string | string[]
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-signal">{String(error)}</span>}
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-[10px] bg-sunken p-0.5 ring-1 ring-inset ring-line"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex h-7 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-all duration-150',
              active
                ? 'bg-surface text-ink shadow-sm ring-1 ring-line'
                : 'text-ink-3 hover:text-ink'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-7 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[13px] font-medium text-ink-3 first-letter:uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-prose text-[15px] text-ink-2">{description}</p>}
      </div>
      {actions}
    </header>
  )
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      {icon && <div className="mb-4 text-ink-3">{icon}</div>}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {children && <div className="mt-1.5 max-w-sm text-sm text-ink-2">{children}</div>}
    </div>
  )
}
