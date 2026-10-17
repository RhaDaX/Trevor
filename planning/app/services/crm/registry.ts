import planningConfig from '#config/planning'
import crmMappings from '#config/crm'
import { SqlCrmAdapter } from '#services/crm/sql_crm_adapter'
import type { CrmAdapter } from '#services/crm/types'

const adapters = new Map<string, CrmAdapter>()

export function adapterFor(source: string): CrmAdapter | null {
  if (adapters.has(source)) return adapters.get(source)!
  const config = planningConfig.crms.find((c) => c.source === source)
  const mapping = crmMappings[source]
  if (!config || !mapping) return null
  const adapter = new SqlCrmAdapter(config, mapping)
  adapters.set(source, adapter)
  return adapter
}

export function allSources() {
  return planningConfig.crms.map((c) => c.source)
}
