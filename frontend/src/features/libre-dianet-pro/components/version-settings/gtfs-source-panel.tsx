import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
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
  const [deleteTarget, setDeleteTarget] = useState<ProGtfsSource | null>(null)
  const deleteTargetUsageCount = deleteTarget ? sourceUsageCount(version, deleteTarget.sourceId) : 0

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
          ZIP ファイルから追加
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
          const usageCount = sourceUsageCount(version, source.sourceId)
          const selectedFileOption = repoInfo?.fileUid
            ? (fileOptions.find((option) => option.uid === repoInfo.fileUid) ?? {
                uid: repoInfo.fileUid,
                label: repoInfo.fileLabel ?? '選択中のGTFSファイル',
                sourceLabel: repoInfo.fileLabel ?? '選択中のGTFSファイル',
                fromDate: null,
                toDate: null,
                memo: null,
                createdAt: null,
              })
            : null
          const fileSelectOptions =
            selectedFileOption && !fileOptions.some((option) => option.uid === selectedFileOption.uid)
              ? [selectedFileOption, ...fileOptions]
              : fileOptions
          return (
            <Card key={source.sourceId} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography>{source.info.name ?? source.info.id}</Typography>
                  <Chip size="small" label={`${usageCount}プリセットで使用中`} color={usageCount > 0 ? 'primary' : 'default'} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {source.info.kind === 'repo'
                    ? `repo: ${source.info.orgId}/${source.info.feedId}${source.info.fileLabel ? ` / ${source.info.fileLabel}` : ''}`
                    : `raw: ${source.info.uuid}`}
                </Typography>
                {source.info.kind === 'repo' && (
                  <TextField
                    select
                    size="small"
                    sx={{ mt: 1, maxWidth: 640 }}
                    disabled={reloading}
                    label={reloading ? 'リビジョンを差し替え中' : 'リビジョン'}
                    value={selectedFileOption?.uid ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      const file = fileSelectOptions.find((option) => option.uid === value)
                      if (file) {
                        onReplaceRepoFile(source, file)
                      }
                    }}
                    SelectProps={{
                      renderValue: (value) => fileSelectOptions.find((option) => option.uid === value)?.label ?? '',
                    }}
                    slotProps={{ inputLabel: fieldLabelProps }}
                  >
                    {fileSelectOptions.map((option) => (
                      <MenuItem key={option.uid} value={option.uid}>
                        <RevisionMenuItem option={option} />
                      </MenuItem>
                    ))}
                  </TextField>
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
                <IconButton onClick={() => (usageCount > 0 ? setDeleteTarget(source) : onDeleteSource(source))}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Card>
          )
        })}
        {version.gtfsSources.length === 0 && <EmptyState text="このバージョンで使用するGTFSを追加してください。" />}
      </Box>
      <Dialog open={Boolean(deleteTarget)} maxWidth="xs" fullWidth onClose={() => setDeleteTarget(null)}>
        <DialogTitle>GTFS設定削除</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
          <Typography>「{deleteTarget?.info.name ?? deleteTarget?.info.id ?? 'このGTFS設定'}」を削除します。</Typography>
          {deleteTargetUsageCount > 0 && (
            <Alert severity="warning">
              {deleteTargetUsageCount}
              プリセットで使われています。削除すると、それらのプリセットからこのGTFSと関連する路線・標柱設定が外れます。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!deleteTarget}
            onClick={() => {
              if (deleteTarget) {
                onDeleteSource(deleteTarget)
              }
              setDeleteTarget(null)
            }}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function sourceUsageCount(version: ProVersion, sourceId: string): number {
  return version.presets.filter((preset) => preset.sourceIds.includes(sourceId)).length
}

function RevisionMenuItem({ option }: { option: GtfsFeedFileOption }) {
  const publishedAt = formatDate(option.createdAt)
  const dateRange = option.fromDate || option.toDate ? `${option.fromDate ?? '?'} - ${option.toDate ?? '?'}` : null

  if (!publishedAt && !dateRange) {
    return <Typography variant="body2">{option.label}</Typography>
  }

  return (
    <Box sx={{ display: 'grid', gap: 0.25, py: 0.25 }}>
      <Typography variant="body2">{[publishedAt ? `公開日 ${publishedAt}` : null, dateRange].filter(Boolean).join(' / ')}</Typography>
      <Typography variant="caption" color="text.secondary">
        {option.memo?.trim()}
      </Typography>
    </Box>
  )
}

function formatDate(value: string | null): string | null {
  return value?.slice(0, 10) || null
}
