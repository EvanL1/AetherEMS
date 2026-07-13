import { describe, expect, it } from 'vitest'
import { confirmedMutationConfig } from '../request'

const requestId = '018f0000-0000-7000-8000-000000000017'

describe('confirmedMutationConfig', () => {
  it('adds a unique audit identity, confirmation, and optional revision guard', () => {
    const config = confirmedMutationConfig(
      { confirmed: true, requestId, expectedRevision: 41 },
      { timeout: 5000, headers: { 'x-client': 'console' } },
    )

    expect(config.timeout).toBe(5000)
    expect(config.headers).toMatchObject({
      'x-client': 'console',
      'x-aether-confirmed': 'true',
      'x-request-id': requestId,
      'x-aether-expected-revision': '41',
    })
  })

  it('rejects missing confirmation, invalid revisions, and invalid request IDs', () => {
    expect(() =>
      confirmedMutationConfig({ confirmed: false, requestId } as unknown as { confirmed: true }),
    ).toThrow('explicit confirmation')
    expect(() =>
      confirmedMutationConfig({ confirmed: true, requestId, expectedRevision: -1 }),
    ).toThrow('Expected revision')
    expect(() => confirmedMutationConfig({ confirmed: true, requestId: 'not-a-uuid' })).toThrow(
      'valid UUID',
    )
  })
})
