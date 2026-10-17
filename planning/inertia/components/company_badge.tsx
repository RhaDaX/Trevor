import type { Company } from '~/lib/types'

export default function CompanyBadge({
  company,
  label,
}: {
  company: Company | null
  label?: string
}) {
  if (!company) return null
  const cls =
    company === 'a'
      ? 'bg-blue-50 text-blue-700 ring-blue-200'
      : 'bg-purple-50 text-purple-700 ring-purple-200'
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${cls}`}
    >
      {label ?? company.toUpperCase()}
    </span>
  )
}
