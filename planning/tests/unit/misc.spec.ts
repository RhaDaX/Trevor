import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { sign, verifySignature } from '#services/crm/signature'
import { similarity, normalize } from '#services/client_matcher'
import { snoozeTarget } from '#services/dates'
import { senderOf } from '#services/mail_capture'
import { readDate, fillTemplate } from '#services/crm/sql_crm_adapter'

const tz = 'Europe/Paris'

test.group('Signature HMAC des webhooks', () => {
  test('valide, falsifiée, périmée', ({ assert }) => {
    const now = 1_800_000_000
    const body = '{"event":"client.upserted"}'
    const signature = sign('s3cret', now, body)
    assert.isTrue(verifySignature('s3cret', String(now), body, signature, now))
    assert.isFalse(verifySignature('s3cret', String(now), body + ' ', signature, now))
    assert.isFalse(verifySignature('autre', String(now), body, signature, now))
    assert.isFalse(verifySignature('s3cret', String(now), body, signature, now + 3600))
    assert.isFalse(verifySignature('s3cret', undefined, body, signature, now))
  })
})

test.group('Report rapide', () => {
  // Jeudi 15 octobre 2026, 16h20 à Paris
  const now = DateTime.fromISO('2026-10-15T16:20', { zone: tz })
  const at = (p: Parameters<typeof snoozeTarget>[0]) =>
    snoozeTarget(p, tz, now).setZone(tz).toFormat('ccc yyyy-MM-dd HH:mm')

  test('+1 h, demain, lundi', ({ assert }) => {
    assert.equal(at('1h'), 'Thu 2026-10-15 17:20')
    assert.equal(at('tomorrow'), 'Fri 2026-10-16 09:00')
    assert.equal(at('monday'), 'Mon 2026-10-19 09:00')
    assert.equal(at('tonight'), 'Thu 2026-10-15 18:00')
  })

  test('lundi depuis un lundi = lundi suivant', ({ assert }) => {
    const monday = DateTime.fromISO('2026-10-19T08:00', { zone: tz })
    assert.equal(snoozeTarget('monday', tz, monday).setZone(tz).toISODate(), '2026-10-26')
  })
})

test.group('Rapprochement client', () => {
  test('similarité et normalisation', ({ assert }) => {
    assert.equal(similarity('dupont', 'dupont'), 1)
    assert.isAbove(similarity('dupond', 'dupont'), 0.8)
    assert.isBelow(similarity('martin', 'dupont'), 0.5)
    assert.equal(normalize('Société Générale d’Éclairage'), 'societe generale d eclairage')
  })
})

test.group('Capture mail', () => {
  test("mail transféré par l'utilisateur : le client est dans le corps", ({ assert }) => {
    const sender = senderOf(
      {
        from: { value: [{ address: 'nathan@agence.fr', name: 'Nathan' }], text: '', html: '' },
        text: '---------- Message transféré ---------\nDe : Jean Dupont <jean@dupont-btp.fr>\nObjet : site',
      } as any,
      ['nathan@agence.fr']
    )
    assert.equal(sender, 'jean@dupont-btp.fr')
  })
})

test.group('Lecture des lignes CRM', () => {
  test('date seule vs date et heure', ({ assert }) => {
    assert.deepEqual(readDate('2026-12-01').dateOnly, true)
    assert.deepEqual(readDate(new Date('2026-12-01T14:30:00Z')).dateOnly, false)
    assert.isNull(readDate(null).date)
  })

  test('gabarit de titre', ({ assert }) => {
    assert.equal(
      fillTemplate('Renouvellement {label}', { label: 'hébergement' }),
      'Renouvellement hébergement'
    )
    assert.equal(fillTemplate('Relance : {subject}', {}), 'Relance')
  })
})
