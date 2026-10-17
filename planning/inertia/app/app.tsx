import '../css/app.css'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import type { ReactNode } from 'react'
import AppLayout from '~/layouts/app_layout'
import { registerServiceWorker } from '~/lib/push'
import { watchSystemTheme } from '~/lib/theme'

const appName = 'Planning'

createInertiaApp({
  progress: { color: '#1c1917' },

  title: (title) => (title ? `${title} · ${appName}` : appName),

  resolve: async (name) => {
    const page: any = await resolvePageComponent(
      `../pages/${name}.tsx`,
      import.meta.glob('../pages/**/*.tsx')
    )
    // Layout persistant pour toutes les pages, sauf connexion et erreurs
    if (
      page.default.layout === undefined &&
      !name.startsWith('auth/') &&
      !name.startsWith('errors/')
    ) {
      page.default.layout = (child: ReactNode) => <AppLayout>{child}</AppLayout>
    }
    return page
  },

  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})

registerServiceWorker()
watchSystemTheme()
