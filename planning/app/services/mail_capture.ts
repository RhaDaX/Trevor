import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImapFlow } from 'imapflow'
import { simpleParser, type ParsedMail } from 'mailparser'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import planningConfig from '#config/planning'
import Attachment from '#models/attachment'
import User from '#models/user'
import taskService from '#services/task_service'

export const ATTACHMENTS_DIR = () => app.makePath('storage/attachments')

const FAILED_FLAG = '$PlanningFailed'

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g

/**
 * Mail transféré par l'utilisateur lui-même : le vrai client est dans le
 * corps (« De : Jean Dupont <jean@dupont.fr> »).
 */
export function senderOf(parsed: Pick<ParsedMail, 'from' | 'text'>, ownEmails: string[]) {
  const from = parsed.from?.value?.[0]?.address?.toLowerCase() ?? null
  const own = new Set(ownEmails.map((e) => e.toLowerCase()))
  if (from && !own.has(from)) return from

  const body = parsed.text ?? ''
  const headerLine = body.match(/^\s*(?:>\s*)?(?:De|From)\s*:\s*(.+)$/im)
  const candidates = [...(headerLine?.[1].match(EMAIL_RE) ?? []), ...(body.match(EMAIL_RE) ?? [])]
  return candidates.map((e) => e.toLowerCase()).find((e) => !own.has(e)) ?? from
}

function cleanSubject(subject: string) {
  return subject.replace(/^\s*((re|tr|fwd?|fw)\s*:\s*)+/i, '').trim() || 'Mail sans sujet'
}

function safeName(name: string) {
  return name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'piece-jointe'
}

/**
 * Transforme un mail en tâche : sujet = titre, corps et pièces jointes conservés,
 * client reconnu par l'adresse de l'expéditeur.
 */
export async function captureMail(user: User, source: Buffer | string) {
  const parsed = await simpleParser(source)
  const sender = senderOf(parsed, [user.email, planningConfig.imap.user ?? ''])
  const body = (parsed.text ?? '').trim()

  const { task } = await taskService.capture(user, {
    text: cleanSubject(parsed.subject ?? ''),
    origin: 'mail',
    senderEmail: sender,
    notes: [sender ? `De : ${parsed.from?.text ?? sender}` : null, body.slice(0, 20_000)]
      .filter(Boolean)
      .join('\n\n'),
  })

  const files = parsed.attachments.filter((a) => a.contentDisposition !== 'inline' || a.filename)
  if (files.length) {
    const dir = join(ATTACHMENTS_DIR(), String(task.id))
    await mkdir(dir, { recursive: true })
    for (const [i, file] of files.entries()) {
      const filename = safeName(file.filename ?? `piece-jointe-${i + 1}`)
      const relative = join(String(task.id), `${i + 1}-${filename}`)
      await writeFile(join(ATTACHMENTS_DIR(), relative), file.content)
      await Attachment.create({
        taskId: task.id,
        filename,
        path: relative,
        mime: file.contentType || 'application/octet-stream',
        size: file.size ?? file.content.length,
      })
    }
  }
  return task
}

/**
 * Relève la boîte dédiée chez Infomaniak (appelée chaque minute par le worker)
 */
export async function pollMailbox() {
  const { host, port, user: login, password, mailbox } = planningConfig.imap
  if (!host || !login || !password) return 0

  const owner = await User.query().orderBy('id', 'asc').first()
  if (!owner) return 0

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user: login, pass: password },
    logger: false,
    socketTimeout: 45_000,
  })

  let captured = 0
  await client.connect()
  const lock = await client.getMailboxLock(mailbox)
  try {
    // Les mails en échec gardent un mot-clé pour ne pas être retentés en boucle
    const uids = (await client.search({ seen: false, unKeyword: FAILED_FLAG }, { uid: true })) || []
    for (const uid of uids) {
      const message = await client.fetchOne(String(uid), { source: true }, { uid: true })
      if (!message || !message.source) continue
      try {
        await captureMail(owner, message.source)
        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })
        captured += 1
      } catch (error) {
        logger.error({ err: error, uid }, 'échec de capture du mail')
        await client.messageFlagsAdd(String(uid), [FAILED_FLAG], { uid: true })
      }
    }
  } finally {
    lock.release()
    await client.logout().catch(() => {})
  }
  if (captured) logger.info({ captured }, 'mails capturés')
  return captured
}
