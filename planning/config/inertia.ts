import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import Task from '#models/task'
import planningConfig from '#config/planning'

const inertiaConfig = defineConfig({
  rootView: 'inertia_layout',

  /**
   * Données partagées avec toutes les pages
   */
  sharedData: {
    user: (ctx) =>
      ctx.inertia.always(() =>
        ctx.auth?.user
          ? {
              id: ctx.auth.user.id,
              email: ctx.auth.user.email,
              fullName: ctx.auth.user.fullName,
              timezone: ctx.auth.user.timezone,
            }
          : null
      ),
    company: (ctx) =>
      ctx.inertia.always(() => (ctx.session?.get('company') as 'a' | 'b' | undefined) ?? null),
    companies: () => planningConfig.crms.map((c) => ({ code: c.company, name: c.name })),
    inboxCount: (ctx) =>
      ctx.inertia.always(async () => {
        if (!ctx.auth?.user) return 0
        const row = await Task.query()
          .where('user_id', ctx.auth.user.id)
          .where('status', 'inbox')
          .count('* as total')
          .first()
        return Number(row?.$extras.total ?? 0)
      }),
    flash: (ctx) =>
      ctx.inertia.always(() => ({
        success: ctx.session?.flashMessages.get('success') ?? null,
        error: ctx.session?.flashMessages.get('error') ?? null,
        newToken: ctx.session?.flashMessages.get('newToken') ?? null,
        undoTaskId: ctx.session?.flashMessages.get('undoTaskId') ?? null,
      })),
    errors: (ctx) => ctx.inertia.always(() => ctx.session?.flashMessages.get('errors') ?? {}),
  },

  ssr: {
    enabled: false,
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}
