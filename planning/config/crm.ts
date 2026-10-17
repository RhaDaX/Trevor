/**
 * Correspondance entre les tables des CRM maison et le modèle de l'outil.
 *
 * ⚠️ Point ouvert du cahier des charges : les noms exacts des tables et des
 * champs de dates utiles restent à confirmer dans chaque CRM. Les valeurs
 * ci-dessous sont des hypothèses à ajuster, rien d'autre n'est à modifier :
 * l'adaptateur, les webhooks et la synchro de nuit lisent tous ce fichier.
 */

export interface CrmDateMapping {
  /** Type de date utile : échéance, renouvellement, relance… */
  kind: string
  table: string
  columns: {
    id: string
    clientId: string
    date: string
    updatedAt?: string
    deletedAt?: string
    /** Colonne booléenne « fait » côté CRM (relance traitée…) */
    done?: string
  }
  /** Titre de la tâche ; {colonne} est remplacé par la valeur de la ligne */
  title: string
  /** Rappel N jours avant la date (ex. renouvellement à anticiper) */
  remindDaysBefore?: number
}

export interface CrmMapping {
  clients: {
    table: string
    columns: {
      id: string
      name: string
      emails: string[]
      website?: string
      phone?: string
      updatedAt?: string
      deletedAt?: string
    }
  }
  dates: CrmDateMapping[]
}

const defaultMapping: CrmMapping = {
  clients: {
    table: 'clients',
    columns: {
      id: 'id',
      name: 'name',
      emails: ['email'],
      website: 'website',
      phone: 'phone',
      updatedAt: 'updated_at',
    },
  },
  dates: [
    {
      kind: 'echeance',
      table: 'invoices',
      columns: { id: 'id', clientId: 'client_id', date: 'due_date', updatedAt: 'updated_at' },
      title: 'Échéance facture {number}',
    },
    {
      kind: 'renouvellement',
      table: 'contracts',
      columns: { id: 'id', clientId: 'client_id', date: 'renewal_date', updatedAt: 'updated_at' },
      title: 'Renouvellement {label}',
      remindDaysBefore: 30,
    },
    {
      kind: 'relance',
      table: 'follow_ups',
      columns: {
        id: 'id',
        clientId: 'client_id',
        date: 'follow_up_at',
        updatedAt: 'updated_at',
        done: 'done',
      },
      title: 'Relance : {subject}',
    },
  ],
}

const crmMappings: Record<string, CrmMapping> = {
  crm_a: defaultMapping,
  crm_b: defaultMapping,
}

export default crmMappings
