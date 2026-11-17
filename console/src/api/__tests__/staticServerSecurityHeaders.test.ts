import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const consoleRoot = process.cwd()
const nginxConfig = readFileSync(path.join(consoleRoot, 'nginx.conf'), 'utf8')

const securityHeaders = [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Content-Security-Policy',
]

const headerDirectives = (block: string): Map<string, string> =>
  new Map(
    [...block.matchAll(/^\s*add_header\s+(\S+)\s+(.+);\s*$/gm)].map((match) => [
      match[1],
      match[2],
    ]),
  )

const locationBlocks = [...nginxConfig.matchAll(/location\s+([^{]+?)\s*\{([^}]*)\}/g)].map(
  (match) => ({ name: match[1], body: match[2] }),
)
const serverLevelHeaders = headerDirectives(nginxConfig.replace(/location\s+[^{]+\{[^}]*\}/g, ''))

describe('static server security headers', () => {
  it('declares every security header at server level with always', () => {
    for (const header of securityHeaders) {
      expect(serverLevelHeaders.get(header)).toMatch(/ always$/)
    }
  })

  it('repeats the server-level security headers in every location that adds a header', () => {
    const overridingLocations = locationBlocks.filter(
      (location) => headerDirectives(location.body).size > 0,
    )
    expect(overridingLocations.map((location) => location.name)).toContain('/')

    const securityHeadersOf = (headers: Map<string, string>) =>
      Object.fromEntries(securityHeaders.map((header) => [header, headers.get(header)]))

    for (const location of overridingLocations) {
      expect({
        location: location.name,
        ...securityHeadersOf(headerDirectives(location.body)),
      }).toEqual({ location: location.name, ...securityHeadersOf(serverLevelHeaders) })
    }
  })

  it('keeps the entry page free of inline scripts that script-src self would block', () => {
    const entryPage = readFileSync(path.join(consoleRoot, 'index.html'), 'utf8')
    const scriptTags = [...entryPage.matchAll(/<script\b([^>]*)>/g)].map((match) => match[1])

    expect(scriptTags.length).toBeGreaterThan(0)
    for (const attributes of scriptTags) {
      expect(attributes).toMatch(/\bsrc=/)
    }
  })
})
