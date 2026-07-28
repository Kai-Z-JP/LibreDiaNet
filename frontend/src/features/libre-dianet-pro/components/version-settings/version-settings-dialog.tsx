import DeleteIcon from '@mui/icons-material/Delete'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import SaveIcon from '@mui/icons-material/Save'
import styled from '@emotion/styled'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import type { FeedOption, ProGtfsSource, ProVersion } from '../../../../types'
import { fieldLabelProps } from '../../model/pro-ui-constants'
import { useVersionSettingsDialog } from '../../model/use-version-settings-dialog'
import { DeleteVersionConfirmDialog } from './delete-version-confirm-dialog'
import { GtfsSourcePanel } from './gtfs-source-panel'

export function VersionSettingsDialog({
  open,
  selectedVersion,
  feedOptions,
  feedLoading,
  onClose,
  onCreateRepoSource,
  onCreateRawSource,
  onReplaceRawSource,
  onUpdateVersion,
  onDeleteVersion,
}: {
  open: boolean
  selectedVersion: ProVersion | null
  feedOptions: FeedOption[]
  feedLoading: boolean
  onClose: () => void
  onCreateRepoSource: (option: FeedOption) => ProGtfsSource
  onCreateRawSource: (file: File) => Promise<ProGtfsSource>
  onReplaceRawSource: (source: ProGtfsSource, file: File) => Promise<ProGtfsSource>
  onUpdateVersion: (version: ProVersion) => void
  onDeleteVersion: (version: ProVersion) => void
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const { state, actions } = useVersionSettingsDialog({
    selectedVersion,
    feedOptions,
    onCreateRepoSource,
    onCreateRawSource,
    onReplaceRawSource,
    onUpdateVersion,
  })
  const { draftVersion, changed, repoSource, repoFileOptionsByFeedKey, reloadingSourceIds, inddExporting, inddExportError } = state

  return (
    <Dialog open={open} maxWidth="md" fullWidth onClose={onClose}>
      <DialogTitle>バージョン設定</DialogTitle>
      <DialogContent>
        {draftVersion ? (
          <VersionSettingsPanel>
            <VersionFieldRow>
              <TextField
                label="改正名"
                size="small"
                value={draftVersion.name}
                onChange={(event) => actions.renameVersion(event.target.value)}
                slotProps={{ inputLabel: fieldLabelProps }}
                sx={{ minWidth: 220, backgroundColor: 'white' }}
              />
              <TextField
                label="基準日"
                size="small"
                type="date"
                value={draftVersion.revisionDate}
                onChange={(event) => actions.changeRevisionDate(event.target.value)}
                slotProps={{ inputLabel: fieldLabelProps }}
                sx={{ minWidth: 180, backgroundColor: 'white' }}
              />
            </VersionFieldRow>
            <GtfsSourcePanel
              version={draftVersion}
              feedOptions={feedOptions}
              feedLoading={feedLoading}
              selectedRepo={repoSource}
              fileOptionsByFeedKey={repoFileOptionsByFeedKey}
              onSelectRepo={actions.selectRepoSource}
              onAddRepo={actions.addRepoSource}
              onAddRaw={actions.addRawSource}
              onRenameSource={actions.renameSource}
              onDeleteSource={actions.removeSource}
              onReplaceRepoFile={actions.replaceRepoFile}
              onReplaceRawSource={actions.replaceRawSource}
              onReloadSource={(source) => void actions.reloadRepoSource(source)}
              reloadingSourceIds={reloadingSourceIds}
            />
            {inddExportError && <Alert severity="error">{inddExportError}</Alert>}
            <Divider sx={{ my: 2 }} />
            <VersionActions>
              <Button
                startIcon={<FolderZipIcon />}
                variant="outlined"
                disabled={draftVersion.presets.length === 0 || inddExporting || reloadingSourceIds.length > 0}
                onClick={() => void actions.exportInddZip()}
              >
                {inddExporting ? 'ZIP作成中…' : 'InDesign用JSON一括出力'}
              </Button>
              <Button startIcon={<SaveIcon />} variant="contained" disabled={!changed || !draftVersion} onClick={actions.save}>
                保存
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                variant="outlined"
                disabled={!selectedVersion}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                バージョン削除
              </Button>
            </VersionActions>
          </VersionSettingsPanel>
        ) : (
          <Typography variant="body2" color="text.secondary">
            バージョンを選択してください
          </Typography>
        )}
        <DeleteVersionConfirmDialog
          open={deleteConfirmOpen}
          version={selectedVersion}
          onClose={() => setDeleteConfirmOpen(false)}
          onDelete={() => {
            if (selectedVersion) {
              onDeleteVersion(selectedVersion)
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  )
}

const VersionSettingsPanel = styled.div`
  display: grid;
  gap: 16px;
  padding-top: 8px;
`

const VersionFieldRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const VersionActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
`
