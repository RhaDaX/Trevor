import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { describeRule, isValidRule, nextOccurrence } from '#services/recurrence'

const tz = 'Europe/Paris'

test.group('Récurrence', () => {
  test('mensuelle : même jour le mois suivant', ({ assert }) => {
    const prev = DateTime.fromISO('2026-10-05T09:00', { zone: tz })
    const next = nextOccurrence('FREQ=MONTHLY', prev, tz)!
    assert.equal(next.setZone(tz).toFormat('yyyy-MM-dd HH:mm'), '2026-11-05 09:00')
  })

  test("9h reste 9h après le passage à l'heure d'hiver", ({ assert }) => {
    // 25 octobre 2026 : changement d'heure
    const prev = DateTime.fromISO('2026-10-20T09:00', { zone: tz })
    const next = nextOccurrence('FREQ=WEEKLY', prev, tz)!
    assert.equal(next.setZone(tz).toFormat('yyyy-MM-dd HH:mm'), '2026-10-27 09:00')
  })

  test('annuelle', ({ assert }) => {
    const prev = DateTime.fromISO('2026-03-01T09:00', { zone: tz })
    assert.equal(
      nextOccurrence('RRULE:FREQ=YEARLY', prev, tz)!.setZone(tz).toISODate(),
      '2027-03-01'
    )
  })

  test('validation et libellés', ({ assert }) => {
    assert.isTrue(isValidRule('FREQ=MONTHLY;INTERVAL=3'))
    assert.isFalse(isValidRule('n importe quoi'))
    assert.equal(describeRule('FREQ=YEARLY'), 'Tous les ans')
  })
})
