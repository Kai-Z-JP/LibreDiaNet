import styled from '@emotion/styled'
import { Card } from '@mui/material'
import { useProSidebar, type ProSidebarActions, type ProSidebarData } from '../../model/use-pro-sidebar'
import { AboutDialog } from './about-dialog'
import { PresetList } from './preset-list'
import { SidebarHeader } from './sidebar-header'
import { StorageSettingsDialog } from './storage-settings-dialog'
import { VersionSelectDialog } from './version-select-dialog'
import { VersionSelectorButton } from './version-selector-button'
import { VersionSettingsDialog } from '../version-settings/version-settings-dialog'

export type ProSidebarProps = {
  data: ProSidebarData
  actions: ProSidebarActions
}

export function ProSidebar({ data, actions }: ProSidebarProps) {
  const model = useProSidebar(data, actions)

  return (
    <SidebarCard>
      <SidebarHeader {...model.headerProps} />
      <VersionSelectorButton {...model.versionSelectorProps} />
      <PresetList {...model.presetListProps} />
      <VersionSelectDialog {...model.versionSelectDialogProps} />
      <VersionSettingsDialog {...model.versionSettingsDialogProps} />
      <AboutDialog {...model.aboutDialogProps} />
      <StorageSettingsDialog {...model.storageSettingsDialogProps} />
    </SidebarCard>
  )
}

const SidebarCard = styled(Card)`
  display: flex;
  width: 360px;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  padding: 16px;
  border-radius: 8px;
  background-color: #f8f9ff;
  box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.25);

  @media (max-width: 1024px) {
    width: 100%;
  }
`
