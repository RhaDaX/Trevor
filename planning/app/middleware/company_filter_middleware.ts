import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Filtre par entreprise (A / B / Tout) : ?company=a|b|all, mémorisé en session
 */
export default class CompanyFilterMiddleware {
  async handle({ request, session }: HttpContext, next: NextFn) {
    const value = request.qs().company
    if (value === 'a' || value === 'b') session.put('company', value)
    else if (value === 'all') session.forget('company')
    return next()
  }
}
