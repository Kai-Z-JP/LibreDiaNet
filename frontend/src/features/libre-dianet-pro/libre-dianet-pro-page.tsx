import styled from '@emotion/styled'
import { Card, CssBaseline } from '@mui/material'
import { ProEditor } from './components/editor/pro-editor'
import { EmptyState } from './components/shared/empty-state'
import { ProSidebar } from './components/sidebar/pro-sidebar'
import { useLibreDiaNetProPage } from './model/use-libre-dianet-pro-page'

export default function LibreDiaNetProPage() {
  const model = useLibreDiaNetProPage()
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
            {!state.selectedVersion || !props.editor ? (
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
