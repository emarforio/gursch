import { describe, expect, it } from 'vitest'
import { deviceLanguage, dictionaries } from './index'

/** Every key path in a dictionary, with whether it holds text or a function. */
function shape(value: unknown, path = ''): string[] {
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k))
  }
  return [`${path}: ${typeof value}`]
}

describe('dictionaries', () => {
  it('have the same keys in every language', () => {
    expect(shape(dictionaries.sv).sort()).toEqual(shape(dictionaries.en).sort())
  })

  it('have no empty strings', () => {
    for (const dict of Object.values(dictionaries)) {
      const texts = JSON.stringify(dict, (_k, v) => (typeof v === 'string' && v.trim() === '' ? '<EMPTY>' : v))
      expect(texts).not.toContain('<EMPTY>')
    }
  })

  it('handle singular and plural', () => {
    expect(dictionaries.en.common.rounds(1)).toBe('1 round')
    expect(dictionaries.en.common.rounds(2)).toBe('2 rounds')
    expect(dictionaries.sv.common.rounds(1)).toBe('1 runda')
    expect(dictionaries.sv.common.rounds(2)).toBe('2 rundor')
    expect(dictionaries.sv.entry.sumPrompt('Anna', 2, 4, 28)).toBe('Summan av Annas 2 kort, 4 till 28.')
    expect(dictionaries.sv.entry.sumPrompt('Lars', 2, 4, 28)).toBe('Summan av Lars 2 kort, 4 till 28.')
    expect([10, 11, 12, 13, 14].map(dictionaries.en.common.card)).toEqual(['10', 'J', 'Q', 'K', 'A'])
    expect([10, 11, 12, 13, 14].map(dictionaries.sv.common.card)).toEqual(['10', 'Kn', 'D', 'K', 'E'])
    expect(dictionaries.en.account.copied(1, 0)).toBe('Copied 1 player to your account.')
    expect(dictionaries.sv.account.copied(2, 1)).toBe('Kopierade 2 spelare och 1 session till ditt konto.')
  })
})

describe('deviceLanguage', () => {
  it('picks Swedish only when it is the first language', () => {
    expect(deviceLanguage(['sv-SE', 'en'])).toBe('sv')
    expect(deviceLanguage(['sv'])).toBe('sv')
    expect(deviceLanguage(['en-GB', 'sv'])).toBe('en')
    expect(deviceLanguage(['de'])).toBe('en')
    expect(deviceLanguage([])).toBe('en')
  })
})
