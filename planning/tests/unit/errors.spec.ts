import { test } from '@japa/runner'
import { errors as vineErrors } from '@vinejs/vine'
import { AppError, describeError } from '#exceptions/app_error'
import {
  currentTraceId,
  newTraceId,
  normalizeTraceId,
  runWithTrace,
  setTraceUser,
  TRACE_ID_PATTERN,
  traceFields,
} from '#services/trace'

test.group('Identifiants de trace', () => {
  test('format lisible, sans caractères ambigus', ({ assert }) => {
    for (let i = 0; i < 200; i++) {
      const id = newTraceId()
      assert.match(id, TRACE_ID_PATTERN)
      assert.notMatch(id.slice(4), /[ILOU]/)
    }
    assert.match(newTraceId('JOB'), /^JOB-/)
  })

  test('saisie approximative normalisée', ({ assert }) => {
    assert.equal(normalizeTraceId('pln 7k4m q2xd'), 'PLN-7K4M-Q2XD')
    assert.equal(normalizeTraceId('7K4MQ2XD'), 'PLN-7K4M-Q2XD')
    assert.equal(normalizeTraceId('job-aaaa-bbbb'), 'JOB-AAAA-BBBB')
  })

  test('contexte asynchrone : champs de log et utilisateur', async ({ assert }) => {
    assert.deepEqual(traceFields(), {})
    await runWithTrace({ traceId: 'PLN-AAAA-BBBB', origin: 'web' }, async () => {
      await new Promise((r) => setTimeout(r, 5))
      setTraceUser(7)
      assert.equal(currentTraceId(), 'PLN-AAAA-BBBB')
      assert.deepEqual(traceFields(), { traceId: 'PLN-AAAA-BBBB', origin: 'web', userId: 7 })
    })
    assert.isUndefined(currentTraceId())
  })
})

test.group('Messages d’erreur', () => {
  test('erreurs connues : message clair et code stable', ({ assert }) => {
    const notFound = describeError(
      Object.assign(new Error('Row not found'), { code: 'E_ROW_NOT_FOUND', status: 404 })
    )
    assert.equal(notFound.code, 'NOT_FOUND')
    assert.equal(notFound.status, 404)
    assert.include(notFound.message, 'n’existe pas')

    const db = describeError(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), { code: 'ECONNREFUSED' })
    )
    assert.equal(db.code, 'DATABASE_UNAVAILABLE')
    assert.equal(db.status, 503)

    const redis = describeError(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:6379'), { code: 'ECONNREFUSED' })
    )
    assert.equal(redis.code, 'QUEUE_UNAVAILABLE')
  })

  test('validation : premier champ en clair et détail par champ', ({ assert }) => {
    const error = new vineErrors.E_VALIDATION_ERROR([
      { field: 'title', message: 'Le champ est obligatoire', rule: 'required' },
      { field: 'title', message: 'Trop court', rule: 'minLength' },
    ])
    const d = describeError(error)
    assert.equal(d.status, 422)
    assert.deepEqual(d.fields, { title: ['Le champ est obligatoire', 'Trop court'] })
    assert.include(d.message, 'title')
  })

  test('erreur inattendue : aucun détail technique exposé', ({ assert }) => {
    const d = describeError(new TypeError("Cannot read properties of undefined (reading 'id')"))
    assert.equal(d.status, 500)
    assert.equal(d.code, 'INTERNAL_ERROR')
    assert.notInclude(d.message, 'undefined')
    assert.isFalse(d.expected)
  })

  test('erreur métier volontaire', ({ assert }) => {
    const d = describeError(
      new AppError('CLIENT_ARCHIVED', 'Ce client est archivé dans le CRM.', { status: 409 })
    )
    assert.deepEqual(
      [d.status, d.code, d.message, d.expected],
      [409, 'CLIENT_ARCHIVED', 'Ce client est archivé dans le CRM.', true]
    )
  })
})
