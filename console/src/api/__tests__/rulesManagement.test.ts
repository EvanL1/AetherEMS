import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createRule,
  deleteRule,
  disableRule,
  enableRule,
  getRuleDetail,
  listRules,
  submitRuleChain,
  updateRule,
} from '../rulesManagement'

vi.mock('@/utils/request', () => {
  const Request = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
  return {
    default: Request,
    Request,
    confirmedMutationConfig: vi.fn(() => ({ headers: { 'x-aether-confirmed': 'true' } })),
  }
})

describe('api/rulesManagement.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists and fetches rule details', async () => {
    const RequestModule = await import('@/utils/request')
    vi.mocked(RequestModule.default.get)
      .mockResolvedValueOnce({ success: true, data: { list: [] } })
      .mockResolvedValueOnce({ success: true, data: { id: 'rule-1' } })

    await listRules()
    await getRuleDetail('rule-1')

    expect(RequestModule.default.get).toHaveBeenNthCalledWith(1, '/api/v1/automation/api/rules')
    expect(RequestModule.default.get).toHaveBeenNthCalledWith(2, '/api/v1/automation/api/rules/rule-1')
  })

  it('creates, updates and deletes rules', async () => {
    const RequestModule = await import('@/utils/request')
    vi.mocked(RequestModule.default.post).mockResolvedValue({ success: true })
    vi.mocked(RequestModule.default.put).mockResolvedValue({ success: true })
    vi.mocked(RequestModule.default.delete).mockResolvedValue({ success: true })

    const createPayload = { name: 'Rule A', description: 'desc' }
    const updatePayload = { id: 'rule-1', name: 'Rule B', description: 'updated' }

    await createRule(createPayload as any, { confirmed: true })
    await updateRule(updatePayload as any, { confirmed: true })
    await deleteRule('rule-1', { confirmed: true })

    const mutationConfig = { headers: { 'x-aether-confirmed': 'true' } }
    expect(RequestModule.default.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/automation/api/rules',
      { ...createPayload, confirmed: true },
      mutationConfig,
    )
    expect(RequestModule.default.put).toHaveBeenCalledWith(
      '/api/v1/automation/api/rules/rule-1',
      { ...updatePayload, confirmed: true },
      mutationConfig,
    )
    expect(RequestModule.default.delete).toHaveBeenCalledWith(
      '/api/v1/automation/api/rules/rule-1',
      mutationConfig,
    )
  })

  it('enables, disables and submits rule chains', async () => {
    const RequestModule = await import('@/utils/request')
    vi.mocked(RequestModule.default.post)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true })

    const chainPayload = {
      id: 'rule-2',
      name: 'Rule Chain',
      description: 'dispatch',
      flow_json: { nodes: [], edges: [] },
    }

    await enableRule('rule-2', { confirmed: true })
    await disableRule('rule-2', { confirmed: true })
    await submitRuleChain(chainPayload as any, { confirmed: true })

    const mutationConfig = { headers: { 'x-aether-confirmed': 'true' } }
    expect(RequestModule.default.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/automation/api/rules/rule-2/enable',
      { confirmed: true },
      mutationConfig,
    )
    expect(RequestModule.default.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/automation/api/rules/rule-2/disable',
      { confirmed: true },
      mutationConfig,
    )
    expect(RequestModule.default.post).toHaveBeenNthCalledWith(
      3,
      '/api/v1/automation/api/rules',
      { ...chainPayload, confirmed: true },
      mutationConfig,
    )
  })
})
