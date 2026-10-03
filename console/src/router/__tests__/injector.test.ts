import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'
import { router } from '../index'
import { ensureRoutesInjected, getFilteredRoutesForSidebar, resetDynamicRoutes } from '../injector'

describe('operator navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    resetDynamicRoutes()
  })

  it.each([
    ['Admin', true],
    ['Viewer', false],
    ['Engineer', false],
  ] as const)(
    'gives %s one alarm workspace with the correct editing access',
    async (role, canEdit) => {
      useUserStore().userInfo = {
        id: 1,
        username: 'operator',
        is_active: true,
        role: { id: 1, name_en: role, name_zh: role, description: '' },
      }

      const menu = getFilteredRoutesForSidebar()
      const alarm = menu.find((route) => route.path === '/alarm')
      expect(alarm?.children?.map((route) => route.name)).toEqual(
        canEdit
          ? ['alarmCurrentRecords', 'alarmHistoryRecords', 'ruleManagement']
          : ['alarmCurrentRecords', 'alarmHistoryRecords'],
      )
      expect(menu.some((route) => route.path === '/control')).toBe(false)

      await ensureRoutesInjected()

      expect(router.hasRoute('alarmCurrentRecords')).toBe(true)
      expect(router.hasRoute('alarmHistoryRecords')).toBe(true)
      expect(router.hasRoute('ruleManagement')).toBe(canEdit)
      expect(router.hasRoute('controlRecord')).toBe(false)
      expect(router.hasRoute('controlManagement')).toBe(false)
    },
  )
})
