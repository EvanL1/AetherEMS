import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const consoleRoot = process.cwd()

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry)
    return statSync(absolute).isDirectory() ? sourceFiles(absolute) : [absolute]
  })

describe('AetherIot application gateway boundary', () => {
  it('routes every Console HTTP call through the versioned aether-api surface', () => {
    const applicationSources = sourceFiles(path.join(consoleRoot, 'src'))
      .filter((file) => /\.(ts|vue)$/.test(file) && !file.includes(`${path.sep}__tests__${path.sep}`))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')

    for (const retiredPrefix of ['/comApi', '/modApi', '/ruleApi', '/hisApi', '/alarmApi', '/netApi']) {
      expect(applicationSources).not.toContain(retiredPrefix)
    }
    for (const internalPort of ['6001', '6002', '6004', '6006', '6007']) {
      expect(applicationSources).not.toMatch(new RegExp(`:${internalPort}(?:\\D|$)`))
    }
  })

  it('development and production proxies expose only aether-api on port 6005', () => {
    const proxyConfiguration = [
      readFileSync(path.join(consoleRoot, 'vite.config.ts'), 'utf8'),
      readFileSync(path.join(consoleRoot, 'nginx.conf'), 'utf8'),
    ].join('\n')

    expect(proxyConfiguration).not.toMatch(/192\.168\.\d+\.\d+/)
    for (const internalPort of ['6001', '6002', '6004', '6006', '6007']) {
      expect(proxyConfiguration).not.toContain(internalPort)
    }
    expect(proxyConfiguration).toContain('6005')
  })
})
