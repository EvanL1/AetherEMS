import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Request } from '@/utils/request'
import { getAllInstances, getInstancePoints } from '../devicesManagement'

vi.mock('@/utils/request', () => ({ Request: { get: vi.fn() } }))

describe('api/devicesManagement.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets instance points', async () => {
    const response = {
      code: 200,
      message: 'OK',
      success: true,
      data: { actions: {}, measurements: {}, properties: {} },
    }
    vi.mocked(Request.get).mockResolvedValueOnce(response)

    await expect(getInstancePoints(3)).resolves.toBe(response)

    expect(Request.get).toHaveBeenCalledExactlyOnceWith('/api/v1/automation/api/instances/3/points')
  })

  it('gets all instances', async () => {
    const response = {
      code: 200,
      message: 'OK',
      success: true,
      data: { list: [{ instance_id: 2 }] },
    }
    vi.mocked(Request.get).mockResolvedValueOnce(response)

    await expect(getAllInstances()).resolves.toBe(response)

    expect(Request.get).toHaveBeenCalledExactlyOnceWith('/api/v1/automation/api/instances/list')
  })
})
