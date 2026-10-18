import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import { attentionCounts } from '#services/attention'
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
    attention: (ctx) =>
      ctx.inertia.always(async () =>
        ctx.auth?.user ? attentionCounts(ctx.auth.user.id) : { overdue: 0, inbox: 0, badge: 0 }
      ),
    flash: (ctx) =>
      ctx.inertia.always(() => ({
        success: ctx.session?.flashMessages.get('success') ?? null,
        error: ctx.session?.flashMessages.get('error') ?? null,
        errorRef: ctx.session?.flashMessages.get('errorRef') ?? null,
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
