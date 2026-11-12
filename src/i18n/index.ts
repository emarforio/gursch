import { create } from 'zustand'
import { en } from './en'
import type { Dictionary } from './en'
import { sv } from './sv'

export type Language = 'en' | 'sv'
export type LanguageChoice = 'auto' | Language
export type { Dictionary }

export const dictionaries: Record<Language, Dictionary> = { en, sv }

/** The choice is kept on the device and never synced, so each device can differ. */
const KEY = 'gursch.v1.language'

/** Swedish when the device's first language is Swedish, otherwise English. */
export function deviceLanguage(languages: readonly string[]): Language {
  return languages[0]?.toLowerCase().startsWith('sv') ? 'sv' : 'en'
}

function deviceLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages?.length ? navigator.languages : [navigator.language]
}

function savedChoice(): LanguageChoice {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === 'en' || raw === 'sv' ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

const resolve = (choice: LanguageChoice): Language => (choice === 'auto' ? deviceLanguage(deviceLanguages()) : choice)

function apply(language: Language) {
  if (typeof document !== 'undefined') document.documentElement.lang = language
}

const initialChoice = savedChoice()

export const useLanguage = create<{ choice: LanguageChoice; language: Language }>(() => ({
  choice: initialChoice,
  language: resolve(initialChoice),
}))

apply(useLanguage.getState().language)

export function setLanguageChoice(choice: LanguageChoice) {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // Storage is blocked. The choice lasts until the page is closed.
  }
  const language = resolve(choice)
  useLanguage.setState({ choice, language })
  apply(language)
}

if (typeof window !== 'undefined') {
  // Follow the device when its language changes while the app is open.
  window.addEventListener('languagechange', () => {
    if (useLanguage.getState().choice === 'auto') setLanguageChoice('auto')
  })
}

/** The strings of the active language. Components using it re-render when the language changes. */
export function useT(): Dictionary {
  return dictionaries[useLanguage((s) => s.language)]
}

/** Locale for dates and numbers: Swedish, or the device's own flavour of English. */
export function locale(): string {
  if (useLanguage.getState().language === 'sv') return 'sv-SE'
  return deviceLanguages().find((l) => l.toLowerCase().startsWith('en') && isLocale(l)) ?? 'en-GB'
}

/** A malformed language tag from the browser would make every number and date throw. */
function isLocale(tag: string): boolean {
  try {
    return Intl.NumberFormat.supportedLocalesOf(tag).length > 0
  } catch {
    return false
  }
}
