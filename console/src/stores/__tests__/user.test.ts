import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { UserInfo } from '@/types/user'
import { useUserStore } from '../user'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  getUserInfo: vi.fn(),
  refreshToken: vi.fn(),
  md5: vi.fn(() => ({ toString: () => 'md5-password' })),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
}))

vi.mock('@/api/user', () => ({
  userApi: {
    login: mocks.login,
    logout: mocks.logout,
    getUserInfo: mocks.getUserInfo,
    refreshToken: mocks.refreshToken,
  },
}))

vi.mock('@/utils/websocket', () => ({ default: { disconnect: vi.fn() } }))
vi.mock('crypto-js/md5', () => ({ default: mocks.md5 }))
vi.mock('element-plus', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    error: mocks.messageError,
  },
}))

const userInfo: UserInfo = {
  id: 7,
  username: 'operator',
  is_active: true,
  role: {
    id: 2,
    name_en: 'Engineer',
    name_zh: '工程师',
    description: 'commissioning role',
  },
}

describe('stores/user.ts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('derives session display state from token and user information', () => {
    const store = useUserStore()

    expect(store.isLoggedIn).toBe(false)
    expect(store.displayName).toBe('')
    expect(store.roles).toEqual([])

    store.token = 'access-token'
    store.userInfo = userInfo

    expect(store.isLoggedIn).toBe(true)
    expect(store.displayName).toBe('operator')
    expect(store.roles).toEqual(['Engineer'])
  })

  it.each([
    ['has no role', { ...userInfo, role: undefined }],
    ['has an unnamed role', { ...userInfo, role: { ...userInfo.role, name_en: '' } }],
  ])('grants no role when the profile %s', (_case, profile) => {
    const store = useUserStore()
    store.token = 'access-token'
    store.userInfo = profile as UserInfo

    expect(store.roles).toEqual([])
  })

  it('hashes the password and stores tokens after a successful login', async () => {
    mocks.login.mockResolvedValue({
      success: true,
      message: 'Welcome',
      data: { access_token: 'access-token', refresh_token: 'refresh-token' },
    })
    const store = useUserStore()

    await expect(store.login({ username: 'operator', password: 'plain-text' })).resolves.toEqual({
      success: true,
      message: 'Welcome',
    })

    expect(mocks.md5).toHaveBeenCalledWith('plain-text')
    expect(mocks.login).toHaveBeenCalledWith({
      username: 'operator',
      password: 'md5-password',
    })
    expect(store.token).toBe('access-token')
    expect(store.refreshToken).toBe('refresh-token')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('Welcome')
  })

  it('returns login failures without mutating the session', async () => {
    mocks.login.mockResolvedValue({ success: false, message: '', data: null })
    const store = useUserStore()

    await expect(store.login({ username: 'operator', password: 'bad' })).resolves.toEqual({
      success: false,
      message: 'Login failed',
    })
    expect(store.token).toBe('')

    mocks.login.mockRejectedValueOnce(new Error('network unavailable'))
    await expect(store.login({ username: 'operator', password: 'bad' })).resolves.toEqual({
      success: false,
      message: 'network unavailable',
    })
  })

  it('loads user information and reports rejected responses and transport errors', async () => {
    const store = useUserStore()
    mocks.getUserInfo.mockResolvedValueOnce({ success: true, message: '', data: userInfo })

    await expect(store.getUserInfo()).resolves.toEqual({
      success: true,
      message: 'Get user info successful',
    })
    expect(store.userInfo).toEqual(userInfo)

    mocks.getUserInfo.mockResolvedValueOnce({ success: false, message: '', data: null })
    await expect(store.getUserInfo()).resolves.toEqual({
      success: false,
      message: 'Get user info failed',
    })

    mocks.getUserInfo.mockRejectedValueOnce(new Error('profile unavailable'))
    await expect(store.getUserInfo()).resolves.toEqual({
      success: false,
      message: 'profile unavailable',
    })
  })

  it('refreshes both tokens and handles missing, rejected, and failed refreshes', async () => {
    const store = useUserStore()

    await expect(store.refreshUserToken()).resolves.toEqual({
      success: false,
      message: 'No refresh token available',
    })
    expect(mocks.refreshToken).not.toHaveBeenCalled()

    store.refreshToken = 'old-refresh-token'
    mocks.refreshToken.mockResolvedValueOnce({
      success: true,
      message: '',
      data: { access_token: 'new-access-token', refresh_token: 'new-refresh-token' },
    })
    await expect(store.refreshUserToken()).resolves.toEqual({
      success: true,
      message: 'Token refreshed successfully',
    })
    expect(mocks.refreshToken).toHaveBeenCalledWith('old-refresh-token')
    expect(store.token).toBe('new-access-token')
    expect(store.refreshToken).toBe('new-refresh-token')

    mocks.refreshToken.mockResolvedValueOnce({ success: false, message: '', data: null })
    await expect(store.refreshUserToken()).resolves.toEqual({
      success: false,
      message: 'Token refresh failed',
    })

    mocks.refreshToken.mockRejectedValueOnce(new Error('refresh unavailable'))
    await expect(store.refreshUserToken()).resolves.toEqual({
      success: false,
      message: 'refresh unavailable',
    })
  })

  it('clears all in-memory user state after a successful logout', async () => {
    mocks.logout.mockResolvedValue({ success: true })
    const store = useUserStore()
    store.token = 'access-token'
    store.refreshToken = 'refresh-token'
    store.userInfo = userInfo
    store.routesInjected = true

    await store.logout()

    expect(mocks.logout).toHaveBeenCalledWith('refresh-token')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('Logout successful')
    expect(store.token).toBe('')
    expect(store.refreshToken).toBe('')
    expect(store.userInfo).toBeNull()
    expect(store.routesInjected).toBe(false)
  })

  it.each([
    [
      'the gateway rejects the logout',
      () => mocks.logout.mockResolvedValueOnce({ success: false, message: '' }),
    ],
    [
      'the logout request fails',
      () => mocks.logout.mockRejectedValueOnce(new Error('logout unavailable')),
    ],
  ])('clears every local credential when %s', async (_case, arrangeLogout) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = useUserStore()
    store.token = 'access-token'
    store.refreshToken = 'refresh-token'
    store.userInfo = userInfo
    store.routesInjected = true
    arrangeLogout()

    await store.logout()

    expect(mocks.logout).toHaveBeenCalledWith('refresh-token')
    expect(store.token).toBe('')
    expect(store.refreshToken).toBe('')
    expect(store.userInfo).toBeNull()
    expect(store.routesInjected).toBe(false)
  })

  it('reports a rejected logout and logs a failed one without the request details', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = useUserStore()

    store.refreshToken = 'refresh-token'
    mocks.logout.mockResolvedValueOnce({ success: false, message: '' })
    await store.logout()
    expect(mocks.messageError).toHaveBeenCalledWith('Logout failed')

    store.refreshToken = 'refresh-token'
    mocks.logout.mockRejectedValueOnce(new Error('logout unavailable'))
    await store.logout()
    expect(consoleError).toHaveBeenCalledWith('Logout API call failed:', 'logout unavailable')
  })

  it('revokes a held refresh token even without an access token', async () => {
    mocks.logout.mockResolvedValue({ success: true })
    const store = useUserStore()
    store.refreshToken = 'refresh-token'

    await store.logout()

    expect(mocks.logout).toHaveBeenCalledWith('refresh-token')
    expect(store.refreshToken).toBe('')
  })

  it('skips the logout request when no refresh token is held', async () => {
    const store = useUserStore()

    await store.logout()

    expect(mocks.logout).not.toHaveBeenCalled()
  })
})
