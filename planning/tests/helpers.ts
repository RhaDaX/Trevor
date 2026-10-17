import User from '#models/user'
import Client from '#models/client'

let counter = 0

export async function makeUser(overrides: Partial<User> = {}) {
  counter += 1
  return User.create({
    email: `nathan${counter}-${Date.now()}@example.com`,
    password: 'secret123',
    fullName: 'Nathan',
    timezone: 'Europe/Paris',
    ...overrides,
  })
}

export async function makeClient(data: Partial<Client> & { name: string }) {
  counter += 1
  return Client.create({
    company: 'a',
    source: 'crm_a',
    externalId: `ext-${counter}-${Date.now()}`,
    emails: [],
    domains: [],
    ...data,
  })
}
