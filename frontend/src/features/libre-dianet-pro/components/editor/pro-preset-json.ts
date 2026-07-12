import type { ProPreset } from '../../../../types'

export function proPresetJsonFileName(name: string): string {
  const safeName = Array.from(name.trim().replace(/[\\/:*?"<>|]/g, '_'))
    .map((character) => (character.charCodeAt(0) < 32 ? '_' : character))
    .join('')
  return `${safeName || 'preset'}.json`
}

export function serializeProPreset(preset: ProPreset): string {
  return `${JSON.stringify(preset, null, 2)}\n`
}
