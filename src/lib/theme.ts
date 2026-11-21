export const themeStorageKey = 'greenplate-theme'

export function readTheme(value: string | null): 'light' | 'dark' | 'system' {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function applyTheme(theme: ReturnType<typeof readTheme>) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

// Apply the stored override before the stylesheet paints.
export const themeBootstrap = `try {
  var theme = localStorage.getItem(${JSON.stringify(themeStorageKey)});
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
} catch {}`
