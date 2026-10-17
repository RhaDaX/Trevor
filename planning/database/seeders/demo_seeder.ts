import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import User from '#models/user'
import Client from '#models/client'
import Task from '#models/task'
import taskService from '#services/task_service'

/**
 * Données de démonstration (développement uniquement) : node ace db:seed
 */
export default class DemoSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    if (app.inProduction) return
    const user =
      (await User.findBy('email', 'nathan@example.com')) ??
      (await User.create({
        email: 'nathan@example.com',
        password: 'secret123',
        fullName: 'Nathan',
      }))

    const clients = await Client.updateOrCreateMany(
      ['source', 'externalId'],
      [
        {
          source: 'crm_a',
          externalId: '1',
          company: 'a',
          name: 'Dupont BTP',
          emails: ['jean@dupont-btp.fr'],
          domains: ['dupont-btp.fr'],
          crmUrl: 'https://crm-a.example.com/clients/1',
        },
        {
          source: 'crm_a',
          externalId: '2',
          company: 'a',
          name: 'Garage Martin',
          emails: ['contact@garage-martin.fr'],
          domains: [],
        },
        {
          source: 'crm_a',
          externalId: '3',
          company: 'a',
          name: 'Cabinet Leroy Avocats',
          emails: ['secretariat@leroy-avocats.fr'],
          domains: ['leroy-avocats.fr'],
        },
        {
          source: 'crm_b',
          externalId: '1',
          company: 'b',
          name: 'Boulangerie Martin',
          emails: ['boulangerie.martin@orange.fr'],
          domains: [],
        },
        {
          source: 'crm_b',
          externalId: '2',
          company: 'b',
          name: 'Immo Horizon',
          emails: ['agence@immo-horizon.fr'],
          domains: ['immo-horizon.fr'],
        },
      ]
    )

    await Task.query().where('user_id', user.id).delete()
    const tz = user.timezone
    const local = DateTime.now().setZone(tz)

    for (const text of [
      'rappeler Dupont jeudi 14h #urgent',
      'envoyer devis vitrine Immo Horizon demain 10h',
      'appeler Martin pour le site',
      'idée : newsletter de fin d’année',
      'payer hébergement OVH tous les mois le 5',
      'point avec Leroy lundi 9h30',
    ]) {
      await taskService.capture(user, { text, origin: 'app' })
    }

    await Task.create({
      userId: user.id,
      clientId: clients[0].id,
      title: 'Mise à jour des horaires sur le site',
      notes: 'De : Jean Dupont <jean@dupont-btp.fr>\n\nPouvez-vous mettre à jour les horaires ?',
      status: 'inbox',
      origin: 'mail',
      priority: 'normal',
    })
    await Task.create({
      userId: user.id,
      clientId: clients[1].id,
      title: 'Relance facture 2026-114',
      dueAt: local.minus({ hours: 3 }).toUTC(),
      status: 'todo',
      origin: 'crm',
      priority: 'normal',
      sourceRef: 'crm_a:echeance:114',
    })
    await Task.create({
      userId: user.id,
      title: 'Vérifier les sauvegardes',
      dueAt: local.set({ hour: 17, minute: 0 }).toUTC(),
      status: 'todo',
      origin: 'siri',
      priority: 'normal',
      company: 'b',
    })
    await Task.create({
      userId: user.id,
      clientId: clients[4].id,
      title: 'Renouvellement hébergement',
      dueAt: local.plus({ days: 20 }).set({ hour: 9, minute: 0 }).toUTC(),
      remindAt: local.plus({ days: 3 }).set({ hour: 9, minute: 0 }).toUTC(),
      allDay: true,
      status: 'todo',
      origin: 'crm',
      priority: 'normal',
      sourceRef: 'crm_b:renouvellement:2',
    })
  }
}
