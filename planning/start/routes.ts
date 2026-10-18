/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const TasksController = () => import('#controllers/tasks_controller')
const ClientsController = () => import('#controllers/clients_controller')
const SearchController = () => import('#controllers/search_controller')
const SettingsController = () => import('#controllers/settings_controller')
const PushController = () => import('#controllers/push_controller')
const CalendarController = () => import('#controllers/calendar_controller')
const WebhooksController = () => import('#controllers/webhooks_controller')
const QuickActionsController = () => import('#controllers/quick_actions_controller')
const ApiTasksController = () => import('#controllers/api/tasks_controller')
const ClientErrorsController = () => import('#controllers/client_errors_controller')

router.get('/health', ({ response }) => response.json({ ok: true }))

/*
| Connexion
*/
router
  .group(() => {
    router.get('/login', [AuthController, 'show']).as('login')
    router.post('/login', [AuthController, 'login'])
  })
  .use(middleware.guest())

/*
| Application (session web)
*/
router
  .group(() => {
    router.on('/').redirectToPath('/today')
    router.post('/logout', [AuthController, 'logout']).as('logout')

    router.get('/today', [TasksController, 'today']).as('today')
    router.get('/upcoming', [TasksController, 'upcoming']).as('upcoming')
    router.get('/done', [TasksController, 'done']).as('done')
    router.get('/inbox', [TasksController, 'inbox']).as('inbox')

    router.post('/tasks', [TasksController, 'store']).as('tasks.store')
    router
      .get('/tasks/:id', [TasksController, 'show'])
      .as('tasks.show')
      .where('id', router.matchers.number())
    router.put('/tasks/:id', [TasksController, 'update']).as('tasks.update')
    router.delete('/tasks/:id', [TasksController, 'destroy']).as('tasks.destroy')
    router.post('/tasks/:id/complete', [TasksController, 'complete']).as('tasks.complete')
    router.post('/tasks/:id/reopen', [TasksController, 'reopen']).as('tasks.reopen')
    router.post('/tasks/:id/snooze', [TasksController, 'snooze']).as('tasks.snooze')
    router.post('/tasks/:id/schedule', [TasksController, 'schedule']).as('tasks.schedule')
    router.post('/tasks/:id/client', [TasksController, 'attachClient']).as('tasks.client')
    router
      .get('/tasks/:id/attachments/:attachmentId', [TasksController, 'attachment'])
      .as('tasks.attachment')

    router.get('/clients', [ClientsController, 'index']).as('clients.index')
    router.get('/clients/:id', [ClientsController, 'show']).as('clients.show')

    router.get('/search', [SearchController, 'handle']).as('search')
    router.post('/client-errors', [ClientErrorsController, 'store']).as('client_errors')

    router.get('/settings', [SettingsController, 'show']).as('settings')
    router.put('/settings', [SettingsController, 'update'])
    router.post('/settings/tokens', [SettingsController, 'createToken'])
    router.delete('/settings/tokens/:id', [SettingsController, 'revokeToken'])
    router.post('/settings/calendar', [SettingsController, 'regenerateCalendar'])
    router.post('/settings/push/test', [SettingsController, 'testPush'])

    router.post('/push/subscribe', [PushController, 'subscribe'])
    router.post('/push/unsubscribe', [PushController, 'unsubscribe'])
    router.delete('/push/devices/:id', [PushController, 'destroy'])
  })
  .use([middleware.auth({ guards: ['web'] }), middleware.company()])

/*
| API à jeton personnel (Siri, Raycast, Raccourci Mac)
*/
router
  .group(() => {
    router.post('/tasks', [ApiTasksController, 'store'])
    router.get('/tasks', [ApiTasksController, 'index'])
  })
  .prefix('/api')
  .use(middleware.auth({ guards: ['api'] }))

/*
| Flux iCal, webhooks CRM, actions des notifications
*/
router.get('/calendar/:token.ics', [CalendarController, 'show']).as('calendar')
router.post('/webhooks/crm/:source', [WebhooksController, 'crm']).as('webhooks.crm')
router.post('/q/:id/:action', [QuickActionsController, 'handle']).as('quick.action')
