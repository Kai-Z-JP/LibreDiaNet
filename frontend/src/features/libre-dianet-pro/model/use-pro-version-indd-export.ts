import { useState } from 'react'
import type { ProVersion } from '../../../types'
import { downloadBlob } from '../../../utils'
import { openProInddVersionContext, prepareProInddPreset } from './pro-indd-export-data'
import { proInddJsonFileNames, proInddZipFileName, serializeProInddPreset } from './pro-indd-export'
import { useProGtfsRepository } from './pro-gtfs-repository-context'
import { proGtfsSourceDisplayName } from './pro-source-helpers'

export function useProVersionInddExport(version: ProVersion | null) {
  const repository = useProGtfsRepository()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestInddZip = async () => {
    if (!version || version.presets.length === 0) {
      return
    }
    setExporting(true)
    setError(null)
    try {
      const context = await openProInddVersionContext(repository, version)
      const sourceNameMap = Object.fromEntries(version.gtfsSources.map((source) => [source.sourceId, proGtfsSourceDisplayName(source)]))
      const fileNames = proInddJsonFileNames(version.presets)
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      for (const [index, preset] of version.presets.entries()) {
        const inddPreset = await prepareProInddPreset({ repository, version, preset, context, sourceNameMap })
        zip.file(fileNames[index] ?? `${index + 1}.json`, serializeProInddPreset(inddPreset))
      }
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })
      downloadBlob(blob, proInddZipFileName(version.name))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'InDesign用ZIPの作成に失敗しました。')
    } finally {
      setExporting(false)
    }
  }

  return {
    exporting,
    error,
    requestInddZip,
  }
}
