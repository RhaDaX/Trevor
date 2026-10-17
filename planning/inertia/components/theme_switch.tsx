import { Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { getThemePreference, setThemePreference, type ThemePreference } from '~/lib/theme'
import { Segmented } from '~/components/ui'

export default function ThemeSwitch({ withLabels = false }: { withLabels?: boolean }) {
  const [pref, setPref] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'system' : getThemePreference()
  )
  const option = (value: ThemePreference, Icon: typeof Sun, label: string) => ({
    value,
    title: label,
    label: (
      <>
        <Icon className="size-3.5" strokeWidth={2} aria-hidden />
        {withLabels ? label : <span className="sr-only">{label}</span>}
      </>
    ),
  })
  return (
    <Segmented
      label="Thème"
      value={pref}
      onChange={(value) => {
        setPref(value)
        setThemePreference(value)
      }}
      options={[
        option('system', Monitor, 'Système'),
        option('light', Sun, 'Clair'),
        option('dark', Moon, 'Sombre'),
      ]}
    />
  )
}
