import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { DateTime } from 'luxon'
import planningConfig from '#config/planning'
import Client from '#models/client'
import SyncState from '#models/sync_state'
import Task from '#models/task'
import crmSync from '#services/crm/crm_sync'
import { sign } from '#services/crm/signature'
import { makeClient, makeUser } from '#tests/helpers'

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

  test('charge invalide : 422 et rien n’est appliqué', async ({ client, assert }) => {
    const response = await signed(client, {
      events: [
        { event: 'client.upserted', data: { id: 501, name: 'Valide' } },
        { event: 'date.upserted', data: { id: 1, date: '2027-01-01' } },
      ],
    })
    response.assertStatus(422)
    assert.include(response.body().error, 'kind')
    assert.isNull(await Client.findBy('external_id', '501'))
  })

  test('champs à null acceptés (format réel d’un CRM Prisma)', async ({ client, assert }) => {
    const response = await signed(client, {
      event: 'client.upserted',
      data: {
        id: 77,
        name: 'Atelier Lune',
        emails: ['hello@atelier-lune.fr'],
        website: null,
        phone: null,
        url: null,
        deleted: false,
      },
    })
    response.assertStatus(202)
    const mirror = await Client.query()
      .where('source', 'crm_a')
      .where('external_id', '77')
      .firstOrFail()
    assert.equal(mirror.name, 'Atelier Lune')
    assert.isNull(mirror.phone)
  })

  test('événement mal formé : 422 en JSON, jamais de redirection', async ({ client, assert }) => {
    const body = JSON.stringify({ event: 'client.renamed', data: {} })
    const ts = Math.floor(Date.now() / 1000)
    const response = await client
      .post('/webhooks/crm/crm_a')
      .header('Content-Type', 'application/json')
      .header('X-Planning-Timestamp', String(ts))
      .header('X-Planning-Signature', sign(SECRET, ts, body))
      .redirects(0)
      .json(JSON.parse(body))
    response.assertStatus(422)
    assert.include(response.body().error, 'invalide')
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
        emails: ['jean@dupont-btp.fr'],
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

    const renewal = {
      id: 7,
      kind: 'renouvellement',
      client_id: 42,
      date: '2027-01-15',
      title: 'Renouvellement hébergement',
    }
    await signed(client, { event: 'date.upserted', data: renewal }).then((r: any) =>
      r.assertStatus(202)
    )
    // Même événement reçu deux fois : pas de doublon
    await signed(client, { event: 'date.upserted', data: renewal })

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
    // Rappel 30 jours avant pour un renouvellement (config/crm.ts)
    assert.equal(task.remindAt!.setZone('Europe/Paris').toISODate(), '2026-12-16')

    // Tâche cochée, puis la date bouge côté CRM (renouvellement reconduit) : elle revit
    task.status = 'done'
    task.doneAt = DateTime.now()
    await task.save()
    await signed(client, { event: 'date.upserted', data: { ...renewal, date: '2028-01-15' } })
    await task.refresh()
    assert.equal(task.status, 'todo')
    assert.equal(task.dueAt!.setZone('Europe/Paris').toISODate(), '2028-01-15')

    // Date supprimée côté CRM : la tâche est annulée
    await signed(client, { event: 'date.deleted', data: renewal })
    await task.refresh()
    assert.equal(task.status, 'cancelled')
  })

  test('lot d’événements et relance marquée faite côté CRM', async ({ client, assert }) => {
    const owner = await makeUser()
    const followUp = {
      id: 3,
      kind: 'relance',
      client_id: 9,
      date: '2026-11-02T14:30:00+01:00',
      title: 'Relance : devis vitrine',
      done: false,
    }
    const response = await signed(client, {
      events: [
        {
          event: 'client.upserted',
          data: { id: 9, name: 'Garage Petit', emails: ['garage@petit.fr'] },
        },
        { event: 'date.upserted', data: followUp },
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
    assert.equal(task.dueAt!.setZone('Europe/Paris').toFormat('HH:mm'), '14:30')

    await signed(client, { event: 'date.upserted', data: { ...followUp, done: true } })
    await task.refresh()
    assert.equal(task.status, 'done')
  })
})

/**
 * Faux CRM : sert /clients et /dates paginés, vérifie le jeton et
 * enregistre les requêtes reçues.
 */
function fakeCrm(pages: { clients: unknown[][]; dates: unknown[][] }) {
  const requests: URL[] = []
  const server: Server = createServer((req: IncomingMessage, res) => {
    const url = new URL(req.url!, 'http://crm.test')
    requests.push(url)
    if (req.headers.authorization !== 'Bearer jeton-crm-a') {
      res.writeHead(401).end()
      return
    }
    const resource = url.pathname.endsWith('/clients')
      ? 'clients'
      : url.pathname.endsWith('/dates')
        ? 'dates'
        : null
    if (!resource) {
      res.writeHead(404).end()
      return
    }
    const page = Number(url.searchParams.get('page') ?? 1)
    const list = pages[resource]
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        data: list[page - 1] ?? [],
        next_page: page < list.length ? page + 1 : null,
      })
    )
  })
  return {
    requests,
    async start() {
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
      return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/planning`
    },
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

test.group('Synchro par l’API des CRM', (group) => {
  const config = planningConfig.crms.find((c) => c.source === 'crm_a')!
  const original = { apiUrl: config.apiUrl, apiToken: config.apiToken }

  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => {
    config.apiUrl = original.apiUrl
    config.apiToken = original.apiToken
  })

  test('synchro complète paginée, puis delta depuis la dernière synchro', async ({ assert }) => {
    const owner = await makeUser()
    const gone = await makeClient({ name: 'Client disparu', source: 'crm_a', externalId: 'old-1' })
    const crm = fakeCrm({
      clients: [
        [{ id: 1, name: 'Alpha Conseil', emails: ['contact@alpha.fr'] }],
        [{ id: 2, name: 'Beta Immo', website: 'beta-immo.fr' }],
      ],
      dates: [
        [
          {
            id: 10,
            kind: 'echeance',
            client_id: 2,
            date: '2027-02-01',
            title: 'Échéance facture F-12',
          },
        ],
      ],
    })
    config.apiUrl = await crm.start()
    config.apiToken = 'jeton-crm-a'

    try {
      const result = await crmSync.syncSource('crm_a', { full: true })
      assert.deepEqual(result, { clients: 2, dates: 1 })

      const clients = await Client.query()
        .where('source', 'crm_a')
        .where('archived', false)
        .orderBy('external_id')
      assert.deepEqual(
        clients.map((c) => c.name),
        ['Alpha Conseil', 'Beta Immo']
      )
      await gone.refresh()
      assert.isTrue(gone.archived)

      const task = await Task.query()
        .where('user_id', owner.id)
        .where('source_ref', 'crm_a:echeance:10')
        .firstOrFail()
      assert.equal(task.title, 'Échéance facture F-12')

      // Pages 1 et 2 des clients, sans filtre de date en mode complet
      const firstRun = crm.requests.filter((u) => u.pathname.endsWith('/clients'))
      assert.deepEqual(
        firstRun.map((u) => u.searchParams.get('page')),
        ['1', '2']
      )
      assert.isNull(firstRun[0].searchParams.get('updated_since'))

      // Synchro suivante : delta
      crm.requests.length = 0
      await crmSync.syncSource('crm_a')
      const since = crm.requests[0].searchParams.get('updated_since')
      assert.isNotNull(since)
      const state = await SyncState.findOrFail('crm_a')
      assert.isNull(state.lastError)
    } finally {
      await crm.stop()
    }
  })

  test('erreur de l’API : enregistrée et remontée', async ({ assert }) => {
    const crm = fakeCrm({ clients: [], dates: [] })
    config.apiUrl = await crm.start()
    config.apiToken = 'mauvais-jeton'
    try {
      await assert.rejects(() => crmSync.syncSource('crm_a'), /HTTP 401/)
      const state = await SyncState.findOrFail('crm_a')
      assert.include(state.lastError!, 'HTTP 401')
    } finally {
      await crm.stop()
    }
  })

  test('sans API configurée, la synchro de nuit l’indique sans échouer', async ({ assert }) => {
    config.apiUrl = undefined
    const results = await crmSync.syncAll()
    assert.equal(results.crm_a, 'API du CRM non configurée')
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
