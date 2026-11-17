import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'
import { Request } from '../request'

vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn() } }))

const accessToken = 'access-token-secret'
const issuedAccessToken = 'issued-access-token-secret'
const issuedRefreshToken = 'issued-refresh-token-secret'
const passwordHash = 'password-hash-secret'
const secrets = [accessToken, issuedAccessToken, issuedRefreshToken, passwordHash]

const consoleMethods = ['log', 'info', 'debug', 'warn', 'error'] as const

const containsSecret = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (typeof value === 'string') return secrets.some((secret) => value.includes(secret))
  if (typeof value !== 'object' || value === null || seen.has(value)) return false
  seen.add(value)
  return Reflect.ownKeys(value).some((key) =>
    containsSecret((value as Record<PropertyKey, unknown>)[key], seen),
  )
}

const loggedArguments = (spies: Array<{ mock: { calls: unknown[][] } }>) =>
  spies.flatMap((spy) => spy.mock.calls.flat())

describe('request credential logging', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())
    useUserStore().token = accessToken
  })

  it('keeps the bearer token, login body, and issued tokens out of the console', async () => {
    const spies = consoleMethods.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    )
    const adapter = async (config: InternalAxiosRequestConfig) => ({
      data: {
        success: true,
        data: { access_token: issuedAccessToken, refresh_token: issuedRefreshToken },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })

    const response = await Request.post(
      '/api/v1/auth/login',
      { username: 'operator', password: passwordHash },
      { adapter },
    )

    expect(response.data.access_token).toBe(issuedAccessToken)
    expect(loggedArguments(spies).filter((argument) => containsSecret(argument))).toEqual([])
  })

  it('keeps the bearer token and request body out of the console when a request fails', async () => {
    const spies = consoleMethods.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    )
    const adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError(
        'Request failed with status code 500',
        'ERR_BAD_RESPONSE',
        config,
        {},
        {
          data: { success: false, message: 'store unavailable' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config,
        },
      )
    }

    await expect(
      Request.post('/api/v1/auth/logout', { refresh_token: issuedRefreshToken }, { adapter }),
    ).rejects.toThrow('Request failed with status code 500')

    expect(loggedArguments(spies).filter((argument) => containsSecret(argument))).toEqual([])
  })
})
