import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isVNode, render } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { ListenerConfig } from '@/types/websocket'
import { useUserStore } from '@/stores/user'
import App from '../App.vue'

const mocks = vi.hoisted(() => {
  const notification = Object.assign(
    vi.fn((_options: Record<string, unknown>) => ({ close: vi.fn() })),
    { success: vi.fn((_options: Record<string, unknown>) => {}), closeAll: vi.fn() },
  )
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    setGlobalListeners: vi.fn(),
    notification,
    push: vi.fn(),
    elementPlus: () => ({
      ElNotification: notification,
      ElMessage: { success: vi.fn(), error: vi.fn() },
      ElConfigProvider: { template: '<div><slot /></div>' },
    }),
  }
})

vi.mock('@/utils/websocket', () => ({
  default: {
    connect: mocks.connect,
    disconnect: mocks.disconnect,
    setGlobalListeners: mocks.setGlobalListeners,
  },
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('element-plus', mocks.elementPlus)
vi.mock('element-plus/es', mocks.elementPlus)
vi.mock('element-plus/es/locale/lang/en', () => ({ default: {} }))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/config-provider/style/css', () => ({}))
vi.mock('@/components/common/AppSkeleton.vue', () => ({ default: { template: '<div />' } }))

const hostilePayload = '<img src=x onerror="window.__alarmPayloadRan = true">Overvoltage'

const mountLoggedInApp = async (): Promise<ListenerConfig> => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const userStore = useUserStore()
  userStore.token = 'access-token'
  userStore.userInfo = {
    id: 1,
    username: 'operator',
    is_active: true,
    role: { id: 3, name_en: 'Viewer', name_zh: 'Viewer', description: '' },
  }
  mocks.connect.mockResolvedValue(undefined)

  mount(App, {
    global: {
      plugins: [pinia],
      stubs: { RouterView: true },
    },
  })
  await vi.waitFor(() => expect(mocks.setGlobalListeners).toHaveBeenCalled())
  return mocks.setGlobalListeners.mock.calls[0][0]
}

const triggeredAlarm = {
  alarm_id: 'alarm-1',
  status: 1,
  message: hostilePayload,
} as Parameters<NonNullable<ListenerConfig['onAlarm']>>[0]

describe('App alarm notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('renders a triggered alarm message as text, never as markup', async () => {
    const listeners = await mountLoggedInApp()

    listeners.onAlarm?.(triggeredAlarm)

    const options = mocks.notification.mock.calls[0][0]
    expect(options.dangerouslyUseHTMLString).not.toBe(true)
    expect(isVNode(options.message)).toBe(true)

    const container = document.createElement('div')
    render(options.message as Parameters<typeof render>[0], container)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.alarm-notification-msg')?.textContent).toBe(hostilePayload)
  })

  it('opens the current alarm list from the notification detail button', async () => {
    const listeners = await mountLoggedInApp()

    listeners.onAlarm?.(triggeredAlarm)

    const options = mocks.notification.mock.calls[0][0]
    const container = document.createElement('div')
    render(options.message as Parameters<typeof render>[0], container)
    container.querySelector<HTMLButtonElement>('.alarm-detail-btn')?.click()

    expect(mocks.notification.closeAll).toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith({ name: 'alarmCurrentRecords' })
  })

  it('passes a recovered alarm message as a plain string', async () => {
    const listeners = await mountLoggedInApp()

    listeners.onAlarm?.({ ...triggeredAlarm, status: 0 })

    const options = mocks.notification.success.mock.calls[0][0]
    expect(options.dangerouslyUseHTMLString).not.toBe(true)
    expect(options.message).toBe(hostilePayload)
  })
})
