import { describe, it, expect, vi } from 'vitest'
import {
  getRuleDetail,
  createRule,
  updateRule,
  deleteRule,
  enableRule,
  disableRule,
} from '../alarm'

vi.mock('@/utils/request', () => ({
  confirmedMutationConfig: vi.fn(() => ({ headers: { 'x-aether-confirmed': 'true' } })),
  Request: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

describe('Alarm API', () => {
  it('should get rule detail', async () => {
    // 修复：mock数据应符合ApiResponse类型结构
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockData)

    const result = await getRuleDetail('1')
    expect(result).toEqual(mockData)
    expect(Request.get).toHaveBeenCalledWith('/api/v1/alarm/rules/1')
  })

  it('should create rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.post).mockResolvedValue(mockData)

    const ruleData = { name: 'new rule', condition: 'test' }
    const result = await createRule(ruleData, { confirmed: true })
    expect(result).toEqual(mockData)
    expect(Request.post).toHaveBeenCalledWith('/api/v1/alarm/rules', ruleData, {
      headers: { 'x-aether-confirmed': 'true' },
    })
  })

  it('should update rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.put).mockResolvedValue(mockData)

    const ruleData = { name: 'updated rule' }
    const result = await updateRule('1', ruleData, { confirmed: true })
    expect(result).toEqual(mockData)
    expect(Request.put).toHaveBeenCalledWith('/api/v1/alarm/rules/1', ruleData, {
      headers: { 'x-aether-confirmed': 'true' },
    })
  })

  it('should delete rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.delete).mockResolvedValue(mockData)

    const result = await deleteRule('1', { confirmed: true })
    expect(result).toEqual(mockData)
    expect(Request.delete).toHaveBeenCalledWith('/api/v1/alarm/rules/1', {
      headers: { 'x-aether-confirmed': 'true' },
    })
  })

  it('should enable rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.patch).mockResolvedValue(mockData)

    const result = await enableRule('1', { confirmed: true })
    expect(result).toEqual(mockData)
    expect(Request.patch).toHaveBeenCalledWith('/api/v1/alarm/rules/1/enable', undefined, {
      headers: { 'x-aether-confirmed': 'true' },
    })
  })

  it('should disable rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.patch).mockResolvedValue(mockData)

    const result = await disableRule('1', { confirmed: true })
    expect(result).toEqual(mockData)
    expect(Request.patch).toHaveBeenCalledWith('/api/v1/alarm/rules/1/disable', undefined, {
      headers: { 'x-aether-confirmed': 'true' },
    })
  })
})
