import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { parseTask } from '#services/task_parser'

const tz = 'Europe/Paris'
// Samedi 17 octobre 2026, 10h à Paris
const now = DateTime.fromISO('2026-10-17T10:00:00', { zone: tz })
const parse = (text: string) => parseTask(text, { timezone: tz, now, defaultHour: 9 })
const local = (d: DateTime | null) => d?.setZone(tz).toFormat('yyyy-MM-dd HH:mm')

test.group('Saisie en langage naturel', () => {
  test('exemple du cahier des charges', ({ assert }) => {
    const r = parse('rappeler Dupont jeudi 14h #urgent')
    assert.equal(r.title, 'Rappeler Dupont')
    assert.equal(local(r.dueAt), '2026-10-22 14:00')
    assert.equal(r.priority, 'high')
    assert.isFalse(r.allDay)
  })

  test("l'heure est celle de Paris, pas celle du serveur", ({ assert }) => {
    const r = parse('point compta lundi 9h30')
    assert.equal(r.dueAt?.toUTC().toFormat('HH:mm'), '07:30')
  })

  test('sans date : pas d’échéance (→ à trier)', ({ assert }) => {
    const r = parse('penser à refaire le site de Martin')
    assert.isNull(r.dueAt)
    assert.equal(r.title, 'Penser à refaire le site de Martin')
  })

  test('jour sans heure : journée entière à 9h', ({ assert }) => {
    const r = parse('envoyer devis demain')
    assert.equal(r.title, 'Envoyer devis')
    assert.equal(local(r.dueAt), '2026-10-18 09:00')
    assert.isTrue(r.allDay)
  })

  test('date explicite', ({ assert }) => {
    assert.equal(local(parse('relancer facture le 3 novembre').dueAt), '2026-11-03 09:00')
    assert.equal(local(parse('rdv 18/11 10h').dueAt), '2026-11-18 10:00')
  })

  test('entreprise et priorité par étiquettes', ({ assert }) => {
    const r = parse('vérifier sauvegardes #b #bas')
    assert.equal(r.company, 'b')
    assert.equal(r.priority, 'low')
    assert.equal(r.title, 'Vérifier sauvegardes')
  })

  test('récurrence simple', ({ assert }) => {
    const monthly = parse('payer hébergement tous les mois le 5 novembre')
    assert.equal(monthly.recurrenceRule, 'FREQ=MONTHLY')
    assert.equal(local(monthly.dueAt), '2026-11-05 09:00')

    const yearly = parse('renouveler domaine chaque année')
    assert.equal(yearly.recurrenceRule, 'FREQ=YEARLY')
    assert.isNotNull(yearly.dueAt)
  })
})

test.group('Saisie en langage naturel — cas limites', () => {
  test('« tous les mois le 5 » : prochain 5 du mois', ({ assert }) => {
    const r = parse('payer hébergement tous les mois le 5')
    assert.equal(r.title, 'Payer hébergement')
    assert.equal(r.recurrenceRule, 'FREQ=MONTHLY')
    assert.equal(local(r.dueAt), '2026-11-05 09:00')
  })

  test('typographie française conservée', ({ assert }) => {
    assert.equal(parse('idée : newsletter').title, 'Idée : newsletter')
  })
})
