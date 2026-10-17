export type ThemePreference = 'system' | 'light' | 'dark'

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem('theme')
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function apply(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && media().matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((m) => (m.content = dark ? '#1b1916' : '#faf8f5'))
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', pref)
  } catch {}
  apply(pref)
}

/** Suit le réglage du système tant que la préférence est « Système » */
export function watchSystemTheme() {
  apply(getThemePreference())
  media().addEventListener('change', () => {
    if (getThemePreference() === 'system') apply('system')
  })
}
