import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import { Autocomplete, Box, Button, Card, IconButton, TextField, Tooltip, Typography } from '@mui/material'
import type { FeedOption, GtfsFeedFileOption, ProGtfsSource, ProVersion } from '../../../../types'
import { repoFeedKey } from '../../model/pro-source-helpers'
import { fieldLabelProps } from '../../model/pro-ui-constants'
import { EmptyState } from '../shared/empty-state'

export function GtfsSourcePanel({
  version,
  feedOptions,
  feedLoading,
  selectedRepo,
  fileOptionsByFeedKey,
  onSelectRepo,
  onAddRepo,
  onAddRaw,
  onDeleteSource,
  onReplaceRepoFile,
  onReplaceRawSource,
  onReloadSource,
  reloadingSourceIds,
}: {
  version: ProVersion
  feedOptions: FeedOption[]
  feedLoading: boolean
  selectedRepo: FeedOption | null
  fileOptionsByFeedKey: Record<string, GtfsFeedFileOption[]>
  onSelectRepo: (option: FeedOption | null) => void
  onAddRepo: () => void
  onAddRaw: (file: File) => void
  onDeleteSource: (source: ProGtfsSource) => void
  onReplaceRepoFile: (source: ProGtfsSource, file: GtfsFeedFileOption) => void
  onReplaceRawSource: (source: ProGtfsSource, file: File) => void
  onReloadSource: (source: ProGtfsSource) => void
  reloadingSourceIds: string[]
}) {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h6">使用GTFS</Typography>
        <Typography variant="body2" color="text.secondary">
          このバージョンで使用するGTFSを管理します。変更は保存ボタンを押すまで確定されません。
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', pt: 1 }}>
        <Autocomplete
          sx={{ minWidth: 360 }}
          disabled={feedLoading}
          options={feedOptions}
          value={selectedRepo}
          onChange={(_, value) => onSelectRepo(value)}
          isOptionEqualToValue={(option, value) => option.feedId === value.feedId && option.orgId === value.orgId}
          renderInput={(params) => (
            <TextField {...params} label="GTFSデータレポジトリ" size="small" slotProps={{ inputLabel: fieldLabelProps }} />
          )}
        />
        <Button startIcon={<AddIcon />} variant="contained" disabled={!selectedRepo} onClick={onAddRepo}>
          追加
        </Button>
        <Button variant="outlined" component="label" startIcon={<AddIcon />}>
          Raw ZIP
          <input
            hidden
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                onAddRaw(file)
              }
              event.currentTarget.value = ''
            }}
          />
        </Button>
      </Box>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {version.gtfsSources.map((source) => {
          const repoInfo = source.info.kind === 'repo' ? source.info : null
          const fileOptions = repoInfo ? (fileOptionsByFeedKey[repoFeedKey(repoInfo.orgId, repoInfo.feedId)] ?? []) : []
          const reloading = reloadingSourceIds.includes(source.sourceId)
          const selectedFileOption = repoInfo?.fileUid
            ? (fileOptions.find((option) => option.uid === repoInfo.fileUid) ?? {
                uid: repoInfo.fileUid,
                label: repoInfo.fileLabel ?? '選択中のGTFSファイル',
                sourceLabel: repoInfo.fileLabel ?? '選択中のGTFSファイル',
              })
            : null
          return (
            <Card key={source.sourceId} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography>{source.info.name ?? source.info.id}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {source.info.kind === 'repo'
                    ? `repo: ${source.info.orgId}/${source.info.feedId}${source.info.fileLabel ? ` / ${source.info.fileLabel}` : ''}`
                    : `raw: ${source.info.uuid}`}
                </Typography>
                {source.info.kind === 'repo' && (
                  <Autocomplete
                    size="small"
                    sx={{ mt: 1, maxWidth: 640 }}
                    disabled={reloading}
                    options={fileOptions}
                    value={selectedFileOption}
                    onChange={(_, value) => {
                      if (value) {
                        onReplaceRepoFile(source, value)
                      }
                    }}
                    isOptionEqualToValue={(option, value) => option.uid === value.uid}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={reloading ? 'GTFSファイルを差し替え中' : 'GTFSファイル'}
                        slotProps={{ inputLabel: fieldLabelProps }}
                        sx={{ backgroundColor: 'white' }}
                      />
                    )}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {source.info.kind === 'repo' && (
                  <Tooltip title="選択中の改正データをDBへ再取り込み">
                    <span>
                      <IconButton disabled={reloading} onClick={() => onReloadSource(source)}>
                        <RefreshIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                {source.info.kind === 'raw' && (
                  <Tooltip title="IDを維持してRaw ZIPを置換">
                    <IconButton component="label">
                      <SyncAltIcon />
                      <input
                        hidden
                        type="file"
                        accept=".zip,application/zip"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            onReplaceRawSource(source, file)
                          }
                          event.currentTarget.value = ''
                        }}
                      />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton onClick={() => onDeleteSource(source)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Card>
          )
        })}
        {version.gtfsSources.length === 0 && <EmptyState text="このバージョンで使用するGTFSを追加してください。" />}
      </Box>
    </Box>
  )
}
