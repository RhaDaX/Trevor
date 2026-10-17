import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Client from '#models/client'
import Task from '#models/task'
import { sign } from '#services/crm/signature'
import { makeUser } from '#tests/helpers'

const SECRET = 'test-secret-a'

function signed(client: any, payload: unknown, secret = SECRET) {
  const body = JSON.stringify(payload)
  const ts = Math.floor(Date.now() / 1000)
  return client
    .post('/webhooks/crm/crm_a')
    .header('Content-Type', 'application/json')
    .header('X-Planning-Timestamp', String(ts))
    .header('X-Planning-Signature', sign(secret, ts, body))
    .json(payload)
}

test.group('Webhooks CRM', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('signature invalide : 401', async ({ client }) => {
    const response = await signed(
      client,
      { event: 'client.upserted', data: { id: 1, name: 'X' } },
      'mauvais'
    )
    response.assertStatus(401)
  })

  test('source inconnue : 404', async ({ client }) => {
    const response = await client.post('/webhooks/crm/inconnu').json({})
    response.assertStatus(404)
  })

  test('client puis date utile → miroir et tâche automatique sans doublon', async ({
    client,
    assert,
  }) => {
    const owner = await makeUser()

    const r1 = await signed(client, {
      event: 'client.upserted',
      data: {
        id: 42,
        name: 'Dupont BTP',
        email: 'jean@dupont-btp.fr',
        website: 'https://www.dupont-btp.fr',
        phone: '0102030405',
      },
    })
    r1.assertStatus(202)
    const mirror = await Client.query()
      .where('source', 'crm_a')
      .where('external_id', '42')
      .firstOrFail()
    assert.equal(mirror.company, 'a')
    assert.deepEqual(mirror.emails, ['jean@dupont-btp.fr'])
    assert.deepEqual(mirror.domains, ['dupont-btp.fr'])

    const renewal = { id: 7, client_id: 42, renewal_date: '2027-01-15', label: 'hébergement' }
    await signed(client, { event: 'date.upserted', kind: 'renouvellement', data: renewal }).then(
      (r: any) => r.assertStatus(202)
    )
    // Même événement reçu deux fois : pas de doublon
    await signed(client, { event: 'date.upserted', kind: 'renouvellement', data: renewal })

    const tasks = await Task.query().where('user_id', owner.id).where('origin', 'crm')
    assert.lengthOf(tasks, 1)
    const task = tasks[0]
    assert.equal(task.title, 'Renouvellement hébergement')
    assert.equal(task.sourceRef, 'crm_a:renouvellement:7')
    assert.equal(task.clientId, mirror.id)
    assert.isTrue(task.allDay)
    assert.equal(
      task.dueAt!.setZone('Europe/Paris').toFormat('yyyy-MM-dd HH:mm'),
      '2027-01-15 09:00'
    )
    // Rappel 30 jours avant (config/crm.ts)
    assert.equal(task.remindAt!.setZone('Europe/Paris').toISODate(), '2026-12-16')

    // Tâche cochée, puis la date bouge côté CRM (renouvellement reconduit) : elle revit
    task.status = 'done'
    task.doneAt = DateTime.now()
    await task.save()
    await signed(client, {
      event: 'date.upserted',
      kind: 'renouvellement',
      data: { ...renewal, renewal_date: '2028-01-15' },
    })
    await task.refresh()
    assert.equal(task.status, 'todo')
    assert.equal(task.dueAt!.setZone('Europe/Paris').toISODate(), '2028-01-15')

    // Date supprimée côté CRM : la tâche est annulée
    await signed(client, { event: 'date.deleted', kind: 'renouvellement', data: renewal })
    await task.refresh()
    assert.equal(task.status, 'cancelled')
  })

  test('lot d’événements et relance marquée faite côté CRM', async ({ client, assert }) => {
    const owner = await makeUser()
    const response = await signed(client, {
      events: [
        {
          event: 'client.upserted',
          data: { id: 9, name: 'Garage Petit', email: 'garage@petit.fr' },
        },
        {
          event: 'date.upserted',
          kind: 'relance',
          data: {
            id: 3,
            client_id: 9,
            follow_up_at: '2026-11-02 14:30:00',
            subject: 'devis vitrine',
            done: 0,
          },
        },
      ],
    })
    response.assertStatus(202)
    assert.equal(response.body().queued, 2)

    const task = await Task.query()
      .where('user_id', owner.id)
      .where('source_ref', 'crm_a:relance:3')
      .firstOrFail()
    assert.equal(task.title, 'Relance : devis vitrine')
    assert.isFalse(task.allDay)

    await signed(client, {
      event: 'date.upserted',
      kind: 'relance',
      data: {
        id: 3,
        client_id: 9,
        follow_up_at: '2026-11-02 14:30:00',
        subject: 'devis vitrine',
        done: 1,
      },
    })
    await task.refresh()
    assert.equal(task.status, 'done')
  })
})

test.group('Flux iCal', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('chaque tâche datée devient un événement avec alerte', async ({ client, assert }) => {
    const user = await makeUser()
    await Task.create({
      userId: user.id,
      title: 'rappeler Dupont',
      dueAt: DateTime.fromISO('2026-10-22T14:00', { zone: 'Europe/Paris' }),
      status: 'todo',
      origin: 'app',
      priority: 'high',
      company: 'a',
    })
    await Task.create({
      userId: user.id,
      title: 'sans date',
      status: 'inbox',
      origin: 'app',
      priority: 'normal',
    })

    const response = await client.get(`/calendar/${user.calendarToken}.ics`)
    response.assertStatus(200)
    assert.include(response.header('content-type'), 'text/calendar')
    const ics = response.text()
    assert.include(ics, 'SUMMARY:[A] rappeler Dupont')
    assert.include(ics, 'BEGIN:VALARM')
    assert.notInclude(ics, 'sans date')
  })

  test('jeton inconnu : 404', async ({ client }) => {
    const response = await client.get('/calendar/inconnu.ics')
    response.assertStatus(404)
  })
})

test.group('Actions depuis la notification', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('URL signée : reporter et cocher sans session', async ({ client, assert }) => {
    const { quickActionUrl } = await import('#services/notifier')
    const user = await makeUser()
    const task = await Task.create({
      userId: user.id,
      title: 'appeler',
      dueAt: DateTime.now().minus({ minutes: 10 }),
      status: 'todo',
      origin: 'app',
      priority: 'normal',
    })

    const snoozeUrl = new URL(quickActionUrl(task, 'snooze-1h'))
    const r1 = await client.post(snoozeUrl.pathname + snoozeUrl.search)
    r1.assertStatus(200)
    await task.refresh()
    assert.isNotNull(task.snoozedUntil)

    const doneUrl = new URL(quickActionUrl(task, 'done'))
    await client.post(doneUrl.pathname + doneUrl.search)
    await task.refresh()
    assert.equal(task.status, 'done')

    const forged = await client.post(`/q/${task.id}/done?signature=abc`)
    forged.assertStatus(403)
  })
})
