import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Request } from '@/utils/request'
import { getAllChannels, getPointsTables } from '../channelsManagement'

vi.mock('@/utils/request', () => ({ Request: { get: vi.fn() } }))

describe('api/channelsManagement.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(['T', 'S', 'C', 'A'] as const)(
    'gets %s point tables with request config',
    async (type) => {
      const response = {
        code: 200,
        message: 'OK',
        success: true,
        data: { list: [{ point_id: 9 }] },
      }
      vi.mocked(Request.get).mockResolvedValueOnce(response)
      const config = { timeout: 3000 }

      await expect(getPointsTables(3, type, config)).resolves.toBe(response)

      expect(Request.get).toHaveBeenCalledExactlyOnceWith(
        '/api/v1/io/api/channels/3/points',
        { type },
        config,
      )
    },
  )

  it('gets all point tables when no type or config is supplied', async () => {
    const response = {
      code: 200,
      message: 'OK',
      success: true,
      data: { telemetry: [], signal: [], control: [], adjustment: [] },
    }
    vi.mocked(Request.get).mockResolvedValueOnce(response)

    await expect(getPointsTables(3)).resolves.toBe(response)

    expect(Request.get).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/io/api/channels/3/points',
      null,
      undefined,
    )
  })

  it('gets all channels', async () => {
    const response = { code: 200, message: 'OK', success: true, data: { list: [{ id: 6 }] } }
    vi.mocked(Request.get).mockResolvedValueOnce(response)

    await expect(getAllChannels()).resolves.toBe(response)

    expect(Request.get).toHaveBeenCalledExactlyOnceWith('/api/v1/io/api/channels/list')
  })
})
