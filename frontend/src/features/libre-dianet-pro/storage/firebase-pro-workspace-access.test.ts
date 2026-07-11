import { validateWorkspaceId } from './firebase-pro-workspace-access'

describe('validateWorkspaceId', () => {
  it.each(['workspace', 'workspace-01', 'workspace_01', crypto.randomUUID()])('accepts %s', (workspaceId) => {
    expect(() => validateWorkspaceId(workspaceId)).not.toThrow()
  })

  it.each(['', 'with space', 'with/slash', '日本語', 'a'.repeat(101)])('rejects %s', (workspaceId) => {
    expect(() => validateWorkspaceId(workspaceId)).toThrow(/Workspace ID/)
  })
})
