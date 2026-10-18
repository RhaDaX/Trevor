import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { createReadStream } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const LEVELS: Record<number, string> = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
}
const HIDDEN = new Set([
  'level',
  'time',
  'pid',
  'hostname',
  'name',
  'msg',
  'traceId',
  'origin',
  'userId',
  'err',
  'stack',
  'v',
])

/**
 * Retrouve tout ce qui s'est passé pour une référence d'erreur, dans les
 * logs de l'app, du worker et des commandes :
 *   node ace trace PLN-7K4M-Q2XD
 */
export default class Trace extends BaseCommand {
  static commandName = 'trace'
  static description =
    'Affiche les logs d’une trace (référence PLN-XXXX-XXXX donnée à l’utilisateur)'

  @args.string({ description: 'Référence de trace, ex. PLN-7K4M-Q2XD' })
  declare traceId: string

  @flags.boolean({ description: 'Sortie JSON brute (une ligne par entrée)' })
  declare json: boolean

  @flags.string({ description: 'Dossier des logs', default: 'storage/logs' })
  declare dir: string

  async run() {
    const { normalizeTraceId } = await import('#services/trace')
    const wanted = normalizeTraceId(this.traceId)
    const dir = this.app.makePath(this.dir)

    let files: string[]
    try {
      const all = await readdir(dir)
      files = all.filter((f) => f.endsWith('.log')).sort()
    } catch {
      this.logger.error(`Aucun log dans ${dir}`)
      this.exitCode = 1
      return
    }

    const entries: { file: string; line: Record<string, any> }[] = []
    for (const file of files) {
      const lines = createInterface({
        input: createReadStream(join(dir, file)),
        crlfDelay: Infinity,
      })
      for await (const raw of lines) {
        if (!raw.includes(wanted)) continue
        try {
          const line = JSON.parse(raw)
          if (line.traceId === wanted || line.relatedTraceId === wanted)
            entries.push({ file, line })
        } catch {}
      }
    }

    if (!entries.length) {
      this.logger.warning(
        `Aucune ligne pour ${wanted} (${files.length} fichier(s) dans ${this.dir}, 14 jours conservés)`
      )
      this.exitCode = 1
      return
    }

    entries.sort((a, b) => a.line.time - b.line.time)
    if (this.json) {
      for (const { line } of entries) this.logger.log(JSON.stringify(line))
      return
    }

    const { colors } = this
    const first = entries[0].line
    this.logger.info(
      `${wanted} — ${entries.length} ligne(s)${first.userId ? `, utilisateur #${first.userId}` : ''}, ${new Date(first.time).toLocaleString('fr-FR')}`
    )
    for (const { file, line } of entries) {
      const level = LEVELS[line.level] ?? String(line.level)
      // Méthodes de couleur appelées sur leur objet (elles s'appuient sur this)
      const paint = (text: string) =>
        line.level >= 50
          ? colors.red(text)
          : line.level >= 40
            ? colors.yellow(text)
            : colors.dim(text)
      const time = new Date(line.time).toISOString().slice(11, 23)
      const role = file.split('.')[0]
      const related =
        line.relatedTraceId === wanted && line.traceId !== wanted
          ? colors.cyan(` (signalée par ${line.traceId})`)
          : ''
      this.logger.log(
        `${colors.dim(time)} ${paint(level.padEnd(5))} ${colors.cyan(role.padEnd(6))} ${line.msg ?? ''}${related}`
      )
      const extra = Object.entries(line).filter(([k]) => !HIDDEN.has(k))
      if (extra.length)
        this.logger.log(
          colors.dim(
            `${' '.repeat(26)}${extra.map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join('  ')}`
          )
        )
      const stack = line.err?.stack ?? line.stack
      if (stack)
        this.logger.log(
          colors.red(
            String(stack)
              .split('\n')
              .slice(0, 12)
              .map((l) => ' '.repeat(26) + l)
              .join('\n')
          )
        )
    }
  }
}
