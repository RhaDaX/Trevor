import planningConfig from '#config/planning'
import { ApiCrmAdapter } from '#services/crm/api_crm_adapter'
import type { CrmAdapter } from '#services/crm/types'

const adapters = new Map<string, CrmAdapter>()

export function crmConfig(source: string) {
  return planningConfig.crms.find((c) => c.source === source) ?? null
}

export function adapterFor(source: string): CrmAdapter | null {
  if (adapters.has(source)) return adapters.get(source)!
  const config = crmConfig(source)
  if (!config) return null
  const adapter = new ApiCrmAdapter(config)
  adapters.set(source, adapter)
  return adapter
}

/** Remplace un adaptateur (tests, CRM au format particulier) */
export function registerAdapter(adapter: CrmAdapter) {
  adapters.set(adapter.source, adapter)
}

export function allSources() {
  return planningConfig.crms.map((c) => c.source)
}
