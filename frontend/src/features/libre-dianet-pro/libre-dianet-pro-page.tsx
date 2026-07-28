import styled from '@emotion/styled'
import { Card, CircularProgress, CssBaseline } from '@mui/material'
import { ProEditor } from './components/editor/pro-editor'
import { EmptyState } from './components/shared/empty-state'
import { ProSidebar } from './components/sidebar/pro-sidebar'
import { useLibreDiaNetProPage } from './model/use-libre-dianet-pro-page'
import { ProGtfsRepositoryProvider } from './model/pro-gtfs-repository-provider'
import { useProWorkspace, type ProWorkspaceController } from './storage/use-pro-workspace'

export default function LibreDiaNetProPage() {
  const workspace = useProWorkspace()
  return (
    <ProGtfsRepositoryProvider repository={workspace.repository}>
      <LibreDiaNetProPageContent workspace={workspace} />
    </ProGtfsRepositoryProvider>
  )
}

function LibreDiaNetProPageContent({ workspace }: { workspace: ProWorkspaceController }) {
  const model = useLibreDiaNetProPage(workspace)
  return <LibreDiaNetProPageView {...model} />
}

function LibreDiaNetProPageView({ state, props }: ReturnType<typeof useLibreDiaNetProPage>) {
  return (
    <>
      <CssBaseline />
      <ProPageRoot>
        <ProPageShell>
          <ProSidebar {...props.sidebar} />
          <ProMainCard>
            {state.loading ? (
              <LoadingState>
                <CircularProgress size={28} />
              </LoadingState>
            ) : !state.selectedVersion || !props.editor ? (
              <EmptyState text="左側からバージョンを作成してください。" />
            ) : (
              <ProEditor {...props.editor} />
            )}
          </ProMainCard>
        </ProPageShell>
      </ProPageRoot>
    </>
  )
}

const ProPageRoot = styled.div`
  height: 100vh;
  overflow: hidden;
  background-color: #f0f0f0;
`

const LoadingState = styled.div`
  display: grid;
  flex: 1;
  place-items: center;
`

const ProPageShell = styled.div`
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 16px;

  @media (max-width: 1024px) {
    flex-direction: column;
    overflow-y: auto;
  }
`

const ProMainCard = styled(Card)`
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  padding: 16px;
  border-radius: 8px;
  background-color: #f8f9ff;
  box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.25);
`
