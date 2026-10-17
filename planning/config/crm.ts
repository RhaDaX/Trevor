/**
 * Types de dates utiles envoyées par les CRM (champ `kind`).
 *
 * Chaque CRM expose ses données au format commun décrit dans
 * app/services/crm/types.ts : c'est lui qui connaît ses tables, l'outil ne
 * lit jamais leurs bases. Un type absent de cette liste est accepté tel quel.
 */
export interface DateKind {
  label: string
  /** Rappel N jours avant la date (le CRM peut le préciser par date) */
  remindDaysBefore: number | null
}

const dateKinds: Record<string, DateKind> = {
  echeance: { label: 'Échéance', remindDaysBefore: null },
  renouvellement: { label: 'Renouvellement', remindDaysBefore: 30 },
  relance: { label: 'Relance', remindDaysBefore: null },
}

export default dateKinds
