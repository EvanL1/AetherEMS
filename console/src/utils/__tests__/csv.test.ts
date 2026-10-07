import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
  type MockInstance,
} from 'vitest'

describe('downloadCsv', () => {
  let createObjectURLMock: Mock<typeof URL.createObjectURL>
  let revokeObjectURLMock: Mock<typeof URL.revokeObjectURL>
  let appendChildMock: MockInstance<typeof document.body.appendChild>
  let removeChildMock: MockInstance<typeof document.body.removeChild>
  let clickMock: Mock<HTMLAnchorElement['click']>
  let createdLink: HTMLAnchorElement
  let capturedBlobContent: string

  beforeEach(() => {
    capturedBlobContent = ''
    createObjectURLMock = vi.fn<typeof URL.createObjectURL>(() => 'blob:mock-url')
    revokeObjectURLMock = vi.fn<typeof URL.revokeObjectURL>()
    clickMock = vi.fn<HTMLAnchorElement['click']>()

    // Capture the blob content with a constructable replacement.
    const OriginalBlob = global.Blob
    class CapturingBlob extends OriginalBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        if (parts) {
          capturedBlobContent = parts.map((part) => String(part)).join('')
        }
        super(parts, options)
      }
    }
    vi.stubGlobal('Blob', CapturingBlob)

    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock

    createdLink = document.createElement('a')
    vi.spyOn(createdLink, 'click').mockImplementation(clickMock)
    appendChildMock = vi.spyOn(document.body, 'appendChild')
    removeChildMock = vi.spyOn(document.body, 'removeChild')

    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return createdLink
      return createElement(tag)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('triggers a file download with correct filename', async () => {
    const { downloadCsv } = await import('../csv')
    const rows = [
      ['name', 'value'],
      ['apple', 1],
      ['banana', 2],
    ]
    downloadCsv(rows, 'test.csv')

    expect(createObjectURLMock).toHaveBeenCalledOnce()
    expect(appendChildMock).toHaveBeenCalledWith(createdLink)
    expect(clickMock).toHaveBeenCalledOnce()
    expect(removeChildMock).toHaveBeenCalledWith(createdLink)
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
    expect(createdLink.download).toBe('test.csv')
  })

  it('escapes cells containing commas', async () => {
    const { downloadCsv } = await import('../csv')
    downloadCsv([['hello, world', 42]], 'out.csv')
    expect(capturedBlobContent).toContain('"hello, world"')
  })

  it('escapes cells containing double quotes', async () => {
    const { downloadCsv } = await import('../csv')
    downloadCsv([['say "hi"', 1]], 'out.csv')
    expect(capturedBlobContent).toContain('"say ""hi"""')
  })

  it('handles empty rows array', async () => {
    const { downloadCsv } = await import('../csv')
    downloadCsv([], 'empty.csv')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
    expect(clickMock).toHaveBeenCalledOnce()
  })

  it('separates rows with CRLF', async () => {
    const { downloadCsv } = await import('../csv')
    downloadCsv(
      [
        ['a', 'b'],
        ['1', '2'],
      ],
      'out.csv',
    )
    expect(capturedBlobContent).toContain('a,b\r\n1,2')
  })
})
