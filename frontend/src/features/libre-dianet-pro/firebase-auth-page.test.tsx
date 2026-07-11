import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FirebaseError } from 'firebase/app'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FirebaseAuthPage from './firebase-auth-page'

const mocks = vi.hoisted(() => ({
  auth: {
    currentUser: null,
    authStateReady: vi.fn().mockResolvedValue(undefined),
  },
  signInWithPopup: vi.fn(),
}))

vi.mock('firebase/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('firebase/auth')>()
  return {
    ...original,
    signInWithPopup: mocks.signInWithPopup,
  }
})

vi.mock('./storage/firebase-pro-client', () => ({
  getFirebaseProClient: () => ({ auth: mocks.auth }),
}))

describe('FirebaseAuthPage', () => {
  beforeEach(() => {
    mocks.auth.currentUser = null
    mocks.auth.authStateReady.mockResolvedValue(undefined)
    mocks.signInWithPopup.mockRejectedValue(new FirebaseError('auth/popup-closed-by-user', 'closed'))
  })

  it('opens Firebase authentication only after an explicit button click', async () => {
    render(<FirebaseAuthPage />)

    const button = await screen.findByRole('button', { name: 'Googleでログイン' })
    expect(mocks.signInWithPopup).not.toHaveBeenCalled()

    fireEvent.click(button)

    await waitFor(() => expect(mocks.signInWithPopup).toHaveBeenCalledOnce())
    expect(await screen.findByText('Google ログインがキャンセルされました')).toBeInTheDocument()
    expect(button).toBeEnabled()
  })
})
