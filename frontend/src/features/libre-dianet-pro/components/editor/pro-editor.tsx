import styled from '@emotion/styled'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Tab, Tabs, Typography } from '@mui/material'
import type { ProPreset, ProPresetContext, ProVersion } from '../../../../types'
import { useProEditorModel } from '../../hooks/use-pro-editor-model'
import { tabLabels } from '../../model/pro-ui-constants'
import { EditableTitle } from '../../../libre-dianet/components/shared'
import { PoleMergePanel } from '../pole-merge/pole-merge-panel'
import { ProPreviewPanel } from '../preview/pro-preview-panel'
import { ProFareTrianglePanel } from '../fare/pro-fare-triangle-panel'
import { EmptyState } from '../shared/empty-state'
import { PresetRoutePanel } from './preset-route-panel'
import { ProPresetDebugPanel } from './pro-preset-debug-panel'

export function ProEditor({
  version,
  preset,
  context,
  feedError,
  onUpdateVersion,
  onDeletePreset,
}: {
  version: ProVersion
  preset: ProPreset | null
  context: ProPresetContext
  feedError: string | null
  onUpdateVersion: (version: ProVersion) => void
  onDeletePreset?: () => void
}) {
  const { props, tabContentRef } = useProEditorModel({
    version,
    preset,
    context,
    feedError,
    onUpdateVersion,
    onDeletePreset,
  })

  return (
    <EditorRoot>
      <EditorToolbar>
        {props.toolbar.draftPreset ? (
          <EditableTitle value={props.toolbar.draftPreset.name} onChange={props.toolbar.onRenamePreset} />
        ) : (
          <Typography sx={{ flexGrow: 1, fontSize: '2em', fontWeight: 'bold', my: '0.67em' }}>{props.toolbar.versionName}</Typography>
        )}
        <Button sx={{ my: 'auto' }} variant="contained" disabled={!props.toolbar.changed} onClick={props.toolbar.onSave}>
          保存
        </Button>
        {props.toolbar.canDeletePreset && (
          <Button sx={{ my: 'auto' }} color="error" variant="outlined" onClick={props.toolbar.onRequestDeletePreset}>
            削除
          </Button>
        )}
      </EditorToolbar>
      {props.status.loading && <LinearProgress />}
      {props.status.feedError && <Alert severity="warning">{props.status.feedError}</Alert>}
      {Object.entries(props.status.draftErrors).map(([sourceId, error]) => (
        <Alert key={sourceId} severity="warning">
          {props.status.sourceNameMap[sourceId] ?? sourceId}: {error}
        </Alert>
      ))}
      <Dialog open={props.deletePresetDialog.open} maxWidth="xs" fullWidth onClose={props.deletePresetDialog.onClose}>
        <DialogTitle>プリセット削除</DialogTitle>
        <DialogContent>
          <Typography>「{props.deletePresetDialog.presetName}」を削除します。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.deletePresetDialog.onClose}>キャンセル</Button>
          <Button
            color="error"
            variant="contained"
            disabled={props.deletePresetDialog.disabled}
            onClick={props.deletePresetDialog.onConfirm}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
      <Tabs
        value={props.tabs.value}
        onChange={(_, next) => props.tabs.onChange(next)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        {tabLabels.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>
      <EditorTabContent ref={tabContentRef}>
        {props.tabs.value === 0 &&
          (props.routePanel ? <PresetRoutePanel {...props.routePanel} /> : <EmptyState text="左側からプリセットを作成してください。" />)}
        {props.tabs.value === 1 &&
          (props.poleMergePanel ? (
            <PoleMergePanel {...props.poleMergePanel} />
          ) : (
            <EmptyState text="左側からプリセットを作成してください。" />
          ))}
        {props.tabs.value === 2 &&
          (props.previewPanel ? <ProPreviewPanel {...props.previewPanel} /> : <EmptyState text="左側からプリセットを作成してください。" />)}
        {props.tabs.value === 3 &&
          (props.farePanel ? <ProFareTrianglePanel {...props.farePanel} /> : <EmptyState text="左側からプリセットを作成してください。" />)}
        {props.tabs.value === 4 &&
          (props.debugPanel ? <ProPresetDebugPanel {...props.debugPanel} /> : <EmptyState text="左側からプリセットを作成してください。" />)}
      </EditorTabContent>
    </EditorRoot>
  )
}

const EditorRoot = styled.div`
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
`

const EditorToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  margin-bottom: 8px;
`

const EditorTabContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-top: 8px;
`
