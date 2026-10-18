import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import ace from '@adonisjs/core/services/ace'
import Trace from '#commands/trace'
import { sign } from '#services/crm/signature'
import { runJobsInline } from '#services/queue'
import { TRACE_ID_PATTERN } from '#services/trace'
import { makeUser } from '#tests/helpers'

test.group('Traçabilité des requêtes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('chaque réponse porte un X-Trace-Id', async ({ client, assert }) => {
    const response = await client.get('/login')
    assert.match(String(response.header('x-trace-id')), TRACE_ID_PATTERN)
  })

  test('une trace transmise par l’appelant est reprise, une invalide remplacée', async ({
    client,
    assert,
  }) => {
    const kept = await client.get('/health').header('X-Trace-Id', 'CRM-AB12-CD34')
    assert.equal(kept.header('x-trace-id'), 'CRM-AB12-CD34')
    const replaced = await client.get('/health').header('X-Trace-Id', 'pas-une-trace')
    assert.match(String(replaced.header('x-trace-id')), /^PLN-/)
  })

  test('API : erreur JSON avec code, message clair et trace', async ({ client, assert }) => {
    const response = await client.post('/api/tasks').json({ text: 'x' })
    response.assertStatus(401)
    const error = response.body().error
    assert.equal(error.code, 'UNAUTHENTICATED')
    assert.include(error.message, 'reconnectez-vous')
    assert.equal(error.traceId, response.header('x-trace-id'))
  })

  test('API : validation détaillée par champ', async ({ client, assert }) => {
    const user = await makeUser()
    const response = await client
      .post('/api/tasks')
      .withGuard('api')
      .loginAs(user)
      .json({ text: '' })
    response.assertStatus(422)
    const error = response.body().error
    assert.equal(error.code, 'VALIDATION_FAILED')
    assert.property(error.fields, 'text')
    assert.match(error.traceId, TRACE_ID_PATTERN)
  })

  test('page introuvable : message et référence affichés', async ({ client, assert }) => {
    const user = await makeUser()
    const response = await client.get('/tasks/999999').loginAs(user).withInertia()
    response.assertStatus(404)
    assert.equal(response.body().component, 'errors/not_found')
    assert.equal(response.body().props.error.traceId, response.header('x-trace-id'))
    assert.equal(response.body().props.error.code, 'NOT_FOUND')
  })

  test('action en échec dans l’app : retour à la page avec message et référence', async ({
    client,
    assert,
  }) => {
    const user = await makeUser()
    const response = await client
      .post('/tasks/999999/complete')
      .loginAs(user)
      .withCsrfToken()
      .header('Referer', '/today')
      .redirects(0)
    response.assertStatus(302)
    const flash = response.flashMessages()
    assert.include(flash.error, 'n’existe pas')
    assert.equal(flash.errorRef, response.header('x-trace-id'))
  })

  test('webhook → job : la même trace de bout en bout', async ({ client, assert }) => {
    let jobTrace: unknown = null
    runJobsInline(async (_name, data) => {
      jobTrace = data._traceId
    })
    try {
      const body = JSON.stringify({ event: 'client.upserted', data: { id: 1, name: 'X' } })
      const ts = Math.floor(Date.now() / 1000)
      const response = await client
        .post('/webhooks/crm/crm_a')
        .header('Content-Type', 'application/json')
        .header('X-Planning-Timestamp', String(ts))
        .header('X-Planning-Signature', sign('test-secret-a', ts, body))
        .json(JSON.parse(body))
      response.assertStatus(202)
      assert.equal(response.body().traceId, response.header('x-trace-id'))
      assert.equal(jobTrace, response.header('x-trace-id'))
    } finally {
      runJobsInline(null)
    }
  })

  test('erreur du navigateur : enregistrée, référence renvoyée, débit limité', async ({
    client,
    assert,
  }) => {
    const user = await makeUser()
    const response = await client
      .post('/client-errors')
      .loginAs(user)
      .withCsrfToken()
      .json({ message: 'boom', source: 'window.error', relatedTraceId: 'PLN-AAAA-BBBB' })
    response.assertStatus(201)
    assert.match(response.body().traceId, TRACE_ID_PATTERN)

    let last = 201
    for (let i = 0; i < 25; i++) {
      const r = await client
        .post('/client-errors')
        .loginAs(user)
        .withCsrfToken()
        .json({ message: `boucle ${i}` })
      last = r.status()
    }
    assert.equal(last, 429)
  })
})

test.group('Commande trace', () => {
  test('retrouve les lignes d’une trace dans tous les fichiers, dans l’ordre', async ({
    assert,
  }) => {
    ace.ui.switchMode('raw')
    const command = await ace.create(Trace, [
      'pln 7k4m q2xd',
      `--dir=${app.makePath('tests/fixtures/logs')}`,
    ])
    await command.exec()
    const logs = command.ui.logger
      .getLogs()
      .map((l) => l.message)
      .join('\n')
    assert.include(logs, 'PLN-7K4M-Q2XD — 3 ligne(s), utilisateur #1')
    // L'erreur (plus ancienne) avant la requête, puis le signalement du navigateur
    assert.isBelow(logs.indexOf('DATABASE_UNAVAILABLE'), logs.indexOf('POST /tasks/12/complete'))
    assert.include(logs, 'Error: connect ECONNREFUSED')
    assert.include(logs, 'signalée par PLN-CCCC-DDDD')
    assert.notInclude(logs, 'GET /today')
    ace.ui.switchMode('normal')
  })

  test('trace inconnue : message clair', async ({ assert }) => {
    ace.ui.switchMode('raw')
    const command = await ace.create(Trace, [
      'PLN-ZZZZ-ZZZZ',
      `--dir=${app.makePath('tests/fixtures/logs')}`,
    ])
    await command.exec()
    assert.equal(command.exitCode, 1)
    assert.include(
      command.ui.logger
        .getLogs()
        .map((l) => l.message)
        .join('\n'),
      'Aucune ligne pour PLN-ZZZZ-ZZZZ'
    )
    ace.ui.switchMode('normal')
  })
})
