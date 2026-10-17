export type Company = 'a' | 'b'

export interface ClientDto {
  id: number
  name: string
  company: Company
  companyName: string
  emails: string[]
  domains: string[]
  phone: string | null
  crmUrl: string | null
  archived: boolean
  openTasks?: number
}

export interface TaskDto {
  id: number
  title: string
  notes: string | null
  status: 'inbox' | 'todo' | 'done' | 'cancelled'
  priority: 'low' | 'normal' | 'high'
  origin: 'mail' | 'mac' | 'siri' | 'app' | 'crm'
  company: Company | null
  allDay: boolean
  dueAt: string | null
  remindAt: string | null
  snoozedUntil: string | null
  alarmAt: string | null
  doneAt: string | null
  createdAt: string
  overdue: boolean
  recurrenceRule: string | null
  recurrenceLabel: string | null
  clientUncertain: boolean
  fromCrm: boolean
  client: ClientDto | null
  attachments: { id: number; filename: string; mime: string; size: number }[]
}

export interface SharedProps {
  user: { id: number; email: string; fullName: string | null; timezone: string } | null
  company: Company | null
  companies: { code: Company; name: string }[]
  inboxCount: number
  flash: {
    success: string | null
    error: string | null
    newToken: { name: string; value: string } | null
    undoTaskId: number | null
  }
  errors: Record<string, string | string[]>
}
