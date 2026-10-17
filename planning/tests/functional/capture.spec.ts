import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { readFile } from 'node:fs/promises'
import { DateTime } from 'luxon'
import User from '#models/user'
import Task from '#models/task'
import clientMatcher from '#services/client_matcher'
import { captureMail } from '#services/mail_capture'
import taskService from '#services/task_service'
import { makeClient, makeUser } from '#tests/helpers'

test.group('Capture via l’API (Siri, Mac)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => clientMatcher.invalidate())

  test('POST /api/tasks avec un jeton personnel', async ({ client, assert }) => {
    const user = await makeUser()
    const dupont = await makeClient({ name: 'Dupont', emails: ['contact@dupont.fr'] })
    const token = await User.accessTokens.create(user, ['tasks:create'], { name: 'iPhone' })

    const response = await client
      .post('/api/tasks')
      .header('Authorization', `Bearer ${token.value!.release()}`)
      .header('X-Planning-Origin', 'siri')
      .json({ text: 'rappeler Dupont jeudi 14h #urgent' })

    response.assertStatus(201)
    const task = await Task.findOrFail(response.body().task.id)
    assert.equal(task.title, 'Rappeler Dupont')
    assert.equal(task.origin, 'siri')
    assert.equal(task.priority, 'high')
    assert.equal(task.status, 'todo')
    assert.equal(task.clientId, dupont.id)
    assert.equal(task.dueAt!.setZone('Europe/Paris').toFormat('ccc HH:mm'), 'Thu 14:00')
    assert.include(response.body().message, 'client Dupont')
  })

  test('sans jeton : 401', async ({ client }) => {
    const response = await client.post('/api/tasks').json({ text: 'test' })
    response.assertStatus(401)
  })

  test('jeton révoqué : 401', async ({ client }) => {
    const user = await makeUser()
    const token = await User.accessTokens.create(user, ['tasks:create'], { name: 'Mac' })
    const value = token.value!.release()
    await User.accessTokens.delete(user, token.identifier)
    const response = await client
      .post('/api/tasks')
      .header('Authorization', `Bearer ${value}`)
      .json({ text: 'x' })
    response.assertStatus(401)
  })

  test('sans date : la tâche part dans « à trier »', async ({ assert }) => {
    const user = await makeUser()
    const { task } = await taskService.capture(user, {
      text: 'idée : refondre la page contact',
      origin: 'mac',
    })
    assert.equal(task.status, 'inbox')
    assert.isNull(task.dueAt)
  })

  test('client ambigu : créée sans client et signalée à trier', async ({ assert }) => {
    const user = await makeUser()
    await makeClient({ name: 'Garage Martin' })
    await makeClient({ name: 'Boulangerie Martin', company: 'b', source: 'crm_b' })
    const { task } = await taskService.capture(user, {
      text: 'appeler Martin demain 10h',
      origin: 'app',
    })
    assert.isNull(task.clientId)
    assert.isTrue(task.clientUncertain)
    assert.equal(task.status, 'inbox')
    assert.isNotNull(task.dueAt)
  })

  test('tag entreprise : le client est cherché dans le bon CRM', async ({ assert }) => {
    const user = await makeUser()
    await makeClient({ name: 'Garage Martin' })
    const b = await makeClient({ name: 'Boulangerie Martin', company: 'b', source: 'crm_b' })
    const { task } = await taskService.capture(user, {
      text: 'appeler Martin demain 10h #b',
      origin: 'app',
    })
    assert.equal(task.clientId, b.id)
  })

  test('mail client : sujet = titre, corps et pièce jointe conservés, client par expéditeur', async ({
    assert,
  }) => {
    const user = await makeUser()
    const client = await makeClient({ name: 'Dupont BTP', emails: ['jean@dupont-btp.fr'] })
    const eml = await readFile(new URL('../fixtures/client_mail.eml', import.meta.url))
    const task = await captureMail(user, eml)
    await task.load('attachments')

    assert.equal(task.title, 'Mise à jour des horaires sur le site')
    assert.equal(task.origin, 'mail')
    assert.equal(task.clientId, client.id)
    assert.include(task.notes!, "horaires d'ouverture")
    assert.equal(task.status, 'inbox')
    assert.lengthOf(task.attachments, 1)
    assert.equal(task.attachments[0].filename, 'horaires.txt')
  })

  test('client reconnu par le domaine de l’expéditeur', async ({ assert }) => {
    const client = await makeClient({ name: 'Cabinet Leroy', domains: ['leroy-avocats.fr'] })
    const match = await clientMatcher.byEmail('secretariat@leroy-avocats.fr')
    assert.equal(match.client?.id, client.id)
    const generic = await clientMatcher.byEmail('quelquun@gmail.com')
    assert.isNull(generic.client)
  })
})

test.group('Cycle de vie d’une tâche', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('une tâche récurrente cochée crée la suivante', async ({ assert }) => {
    const user = await makeUser()
    const { task } = await taskService.capture(user, {
      text: 'payer URSSAF tous les mois le 5 novembre',
      origin: 'app',
    })
    const { next } = await taskService.complete(task)
    assert.equal(task.status, 'done')
    assert.isNotNull(next)
    assert.equal(next!.dueAt!.setZone('Europe/Paris').toISODate(), '2026-12-05')
    assert.equal(next!.recurrenceRule, 'FREQ=MONTHLY')
    assert.equal(next!.status, 'todo')
  })

  test('report : sans date → date ; avec date → snoozed_until', async ({ assert }) => {
    const user = await makeUser()
    const { task: undated } = await taskService.capture(user, {
      text: 'trier la compta',
      origin: 'app',
    })
    await taskService.snooze(undated, 'tomorrow', user.timezone)
    assert.isNotNull(undated.dueAt)
    assert.isNull(undated.snoozedUntil)
    assert.equal(undated.status, 'todo')

    const { task: dated } = await taskService.capture(user, {
      text: 'appeler la banque demain 11h',
      origin: 'app',
    })
    const due = dated.dueAt!.toISO()
    await taskService.snooze(dated, '1h', user.timezone)
    assert.equal(dated.dueAt!.toISO(), due)
    assert.isNotNull(dated.snoozedUntil)
  })

  test('les vues web s’affichent', async ({ client }) => {
    const user = await makeUser()
    await taskService.capture(user, { text: 'tâche du jour aujourd’hui 23h', origin: 'app' })
    for (const url of ['/today', '/inbox', '/upcoming', '/done', '/clients', '/settings']) {
      const response = await client.get(url).loginAs(user).withInertia()
      response.assertStatus(200)
    }
  })

  test('saisie rapide depuis l’app (Cmd+K)', async ({ client, assert }) => {
    const user = await makeUser()
    const response = await client
      .post('/tasks')
      .loginAs(user)
      .withCsrfToken()
      .redirects(0)
      .form({ text: 'faire le point avec Paul lundi 10h' })
    response.assertStatus(302)
    const task = await Task.query().where('user_id', user.id).firstOrFail()
    assert.equal(task.title, 'Faire le point avec Paul')
    assert.equal(task.origin, 'app')
  })

  test('compteurs : retards, à trier, faites aujourd’hui', async ({ client, assert }) => {
    const user = await makeUser()
    await Task.create({
      userId: user.id,
      title: 'en retard',
      dueAt: DateTime.now().minus({ hours: 2 }),
      status: 'todo',
      origin: 'app',
      priority: 'normal',
    })
    await taskService.capture(user, { text: 'idée sans date', origin: 'app' })
    const { task } = await taskService.capture(user, {
      text: 'faite tout de suite demain',
      origin: 'app',
    })
    await taskService.complete(task)

    const response = await client.get('/today').loginAs(user).withInertia()
    const props = response.body().props
    assert.deepEqual(props.attention, { overdue: 1, inbox: 1, badge: 2 })
    assert.lengthOf(props.doneToday, 1)
    assert.lengthOf(props.overdue, 1)
  })

  test('un autre utilisateur ne voit pas la tâche', async ({ client }) => {
    const owner = await makeUser()
    const other = await makeUser()
    const { task } = await taskService.capture(owner, { text: 'secret', origin: 'app' })
    const response = await client.get(`/tasks/${task.id}`).loginAs(other)
    response.assertStatus(404)
  })

  test('recherche Cmd+K : aperçu de la tâche', async ({ client, assert }) => {
    const user = await makeUser()
    const response = await client
      .get('/search')
      .qs({ q: 'relancer devis vendredi 15h' })
      .loginAs(user)
    response.assertStatus(200)
    assert.equal(response.body().preview.title, 'Relancer devis')
    assert.isFalse(response.body().preview.goesToInbox)
  })

  test('filtre entreprise A / B / Tout', async ({ client, assert }) => {
    const user = await makeUser()
    const a = await makeClient({ name: 'Alpha Conseil' })
    const b = await makeClient({ name: 'Beta Immo', company: 'b', source: 'crm_b' })
    await taskService.capture(user, { text: 'tâche A demain', origin: 'app', clientId: a.id })
    await taskService.capture(user, { text: 'tâche B demain', origin: 'app', clientId: b.id })
    await taskService.capture(user, { text: 'tâche b sans client demain #b', origin: 'app' })

    const onlyB = await client.get('/upcoming').qs({ company: 'b' }).loginAs(user).withInertia()
    const titles = onlyB.body().props.tasks.map((t: any) => t.title)
    assert.sameMembers(titles, ['Tâche B', 'Tâche b sans client'])
  })
})

test.group('Rappels', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('sonne une fois à l’échéance, puis relance à intervalle en journée', async ({ assert }) => {
    const { default: reminders } = await import('#services/reminders')
    const user = await makeUser({ nagIntervalMinutes: 120, nagStartHour: 8, nagEndHour: 19 })
    // Jeudi 15 octobre 2026, 10h à Paris
    const t0 = DateTime.fromISO('2026-10-15T10:00', { zone: 'Europe/Paris' })
    const task = await Task.create({
      userId: user.id,
      title: 'rappeler Dupont',
      dueAt: t0.minus({ minutes: 5 }),
      status: 'todo',
      origin: 'app',
      priority: 'normal',
    })

    assert.equal(await reminders.ringDue(user, t0), 1)
    assert.equal(await reminders.ringDue(user, t0.plus({ minutes: 1 })), 0)
    assert.equal(await reminders.nagOverdue(user, t0.plus({ minutes: 60 })), 0)
    assert.equal(await reminders.nagOverdue(user, t0.plus({ minutes: 121 })), 1)
    // Le soir : silence
    assert.equal(await reminders.nagOverdue(user, t0.set({ hour: 21 })), 0)

    // Reporter remet le compteur : ça re-sonne à la nouvelle heure
    await task.refresh()
    task.snoozedUntil = t0.plus({ hours: 5 })
    task.lastNotifiedAt = null
    await task.save()
    assert.equal(await reminders.ringDue(user, t0.plus({ hours: 4 })), 0)
    assert.equal(await reminders.ringDue(user, t0.plus({ hours: 5, minutes: 1 })), 1)
  })

  test('récap du matin une fois par jour, après l’heure choisie', async ({ assert }) => {
    const { default: mail } = await import('@adonisjs/mail/services/main')
    const { default: reminders } = await import('#services/reminders')
    const fake = mail.fake()
    const user = await makeUser({ recapHour: 8, recapMinute: 0 })
    await taskService.capture(user, { text: 'idée sans date', origin: 'app' })

    const morning = DateTime.fromISO('2026-10-15T07:30', { zone: 'Europe/Paris' })
    assert.isFalse(await reminders.morningRecap(user, morning))
    assert.isTrue(await reminders.morningRecap(user, morning.plus({ hours: 1 })))
    assert.isFalse(await reminders.morningRecap(user, morning.plus({ hours: 3 })))
    fake.messages.assertSentCount(1)
    mail.restore()
  })
})
