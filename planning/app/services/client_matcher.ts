import Client from '#models/client'

export interface ClientMatch {
  client: Client | null
  /** true quand le rapprochement est ambigu : la tâche part dans « à trier » */
  uncertain: boolean
  candidates: Client[]
}

/** Fournisseurs de mail grand public : le domaine ne désigne pas un client */
const GENERIC_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.fr',
  'yahoo.com',
  'hotmail.com',
  'hotmail.fr',
  'outlook.com',
  'outlook.fr',
  'live.fr',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'sfr.fr',
  'neuf.fr',
  'laposte.net',
  'bbox.fr',
  'gmx.fr',
  'gmx.com',
  'proton.me',
  'protonmail.com',
  'infomaniak.com',
  'ik.me',
])

/** Mots qui ne désignent jamais un client */
const STOPWORDS = new Set(
  (
    'le la les un une des de du d l au aux et ou a à en pour par sur avec chez sans ' +
    'ce cet cette ces son sa ses mon ma mes ton ta tes leur leurs nos vos ' +
    'appeler rappeler appel relancer relance envoyer envoi faire voir revoir penser ' +
    'devis facture factures mail mails email site sites web contrat rdv reunion réunion ' +
    'mettre ligne jour mise point demander repondre répondre preparer préparer ' +
    'sarl sas sasu eurl sa sci snc scop ets etablissements établissements ste société societe ' +
    'groupe cie compagnie and the'
  ).split(/\s+/)
)

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9@.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function significantTokens(text: string) {
  return normalize(text)
    .replace(/[@.]/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
}

/** Similarité de Levenshtein normalisée entre 0 et 1 */
export function similarity(a: string, b: string) {
  if (a === b) return 1
  const m = a.length
  const n = b.length
  if (!m || !n) return 0
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const curr = [i]
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    prev = curr
  }
  return 1 - prev[n] / Math.max(m, n)
}

export function domainOf(email: string) {
  const at = email.lastIndexOf('@')
  return at === -1
    ? ''
    : email
        .slice(at + 1)
        .toLowerCase()
        .trim()
}

interface IndexedClient {
  client: Client
  tokens: string[]
  emails: string[]
  domains: string[]
}

/**
 * Rapprochement flou des tâches avec les ~1000 clients des deux CRM.
 * L'index tient en mémoire et se recharge toutes les minutes.
 */
export class ClientMatcher {
  #index: IndexedClient[] | null = null
  #loadedAt = 0
  #ttlMs = 60_000

  invalidate() {
    this.#index = null
  }

  async #load() {
    if (this.#index && Date.now() - this.#loadedAt < this.#ttlMs) return this.#index
    const clients = await Client.query().where('archived', false)
    this.#index = clients.map((client) => ({
      client,
      tokens: significantTokens(client.name),
      emails: client.emails.map((e) => e.toLowerCase().trim()),
      domains: [
        ...client.domains.map((d) =>
          d
            .toLowerCase()
            .replace(/^www\./, '')
            .trim()
        ),
        ...client.emails.map(domainOf),
      ].filter((d) => d && !GENERIC_DOMAINS.has(d)),
    }))
    this.#loadedAt = Date.now()
    return this.#index
  }

  /** Par adresse de l'expéditeur : email exact, sinon domaine */
  async byEmail(address: string): Promise<ClientMatch> {
    const index = await this.#load()
    const email = address.toLowerCase().trim()
    const exact = index.filter((c) => c.emails.includes(email)).map((c) => c.client)
    if (exact.length === 1) return { client: exact[0], uncertain: false, candidates: exact }
    if (exact.length > 1) return { client: null, uncertain: true, candidates: exact }

    const domain = domainOf(email)
    if (!domain || GENERIC_DOMAINS.has(domain)) {
      return { client: null, uncertain: false, candidates: [] }
    }
    const byDomain = index.filter((c) => c.domains.includes(domain)).map((c) => c.client)
    if (byDomain.length === 1)
      return { client: byDomain[0], uncertain: false, candidates: byDomain }
    return { client: null, uncertain: byDomain.length > 1, candidates: byDomain }
  }

  /**
   * Par le texte de la tâche : « rappeler Dupont jeudi » → client Dupont.
   * Un seul candidat exact = rattachement ; plusieurs ou approchant = à trier.
   */
  async byText(text: string, company?: 'a' | 'b' | null): Promise<ClientMatch> {
    const words = significantTokens(text)
    if (!words.length) return { client: null, uncertain: false, candidates: [] }

    const index = await this.#load()
    const normalizedText = ` ${normalize(text)} `
    const scored: { client: Client; score: number; exact: boolean }[] = []

    for (const entry of index) {
      if (company && entry.client.company !== company) continue
      if (!entry.tokens.length) continue

      let matched = 0
      let exact = true
      for (const token of entry.tokens) {
        let best = 0
        for (const word of words) {
          const s = similarity(word, token)
          if (s > best) best = s
          if (best === 1) break
        }
        if (best === 1) matched += 1
        else if (best >= 0.8 && token.length >= 5) {
          matched += best
          exact = false
        }
      }
      if (!matched) continue

      // Le nom complet présent tel quel dans le texte : correspondance forte
      const fullName = normalize(entry.client.name)
      const fullHit = fullName.length >= 3 && normalizedText.includes(` ${fullName} `)
      const score = fullHit ? 10 + entry.tokens.length : matched + matched / entry.tokens.length
      scored.push({ client: entry.client, score, exact: exact || fullHit })
    }

    if (!scored.length) return { client: null, uncertain: false, candidates: [] }
    scored.sort((a, b) => b.score - a.score)
    const top = scored[0]
    const candidates = scored.slice(0, 5).map((s) => s.client)
    const tied = scored.length > 1 && scored[1].score >= top.score - 0.01

    if (top.exact && !tied) return { client: top.client, uncertain: false, candidates }
    return { client: null, uncertain: true, candidates }
  }
}

const clientMatcher = new ClientMatcher()
export default clientMatcher
