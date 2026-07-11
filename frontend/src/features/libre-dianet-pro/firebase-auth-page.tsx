import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import { Alert, Box, Button, CircularProgress, CssBaseline, Typography } from '@mui/material'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { useCallback, useEffect, useState } from 'react'
import { createFirebaseAuthReturnUrl } from './storage/firebase-auth-navigation'
import { getFirebaseProClient } from './storage/firebase-pro-client'

const AUTH_TIMEOUT_MS = 10_000

export default function FirebaseAuthPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const authenticate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { auth } = getFirebaseProClient()
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
      window.location.replace(createFirebaseAuthReturnUrl().toString())
    } catch (authError) {
      setError(firebaseAuthErrorMessage(authError))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const prepare = async () => {
      try {
        const { auth } = getFirebaseProClient()
        await withTimeout(auth.authStateReady(), AUTH_TIMEOUT_MS)
        if (auth.currentUser) {
          window.location.replace(createFirebaseAuthReturnUrl().toString())
          return
        }
      } catch (authError) {
        if (!cancelled) {
          setError(firebaseAuthErrorMessage(authError))
        }
      }
      if (!cancelled) {
        setLoading(false)
      }
    }
    void prepare()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
        <Box sx={{ display: 'grid', justifyItems: 'center', gap: 2, width: 'min(100%, 480px)' }}>
          <AccountCircleOutlinedIcon color="primary" sx={{ fontSize: 44 }} />
          <Typography variant="h6">Firebase ログイン</Typography>
          {loading ? <CircularProgress size={28} /> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {!loading ? (
            <Button variant="contained" startIcon={<AccountCircleOutlinedIcon />} onClick={() => void authenticate()}>
              Googleでログイン
            </Button>
          ) : null}
        </Box>
      </Box>
    </>
  )
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: number | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = window.setTimeout(() => reject(new Error('Firebase ログインがタイムアウトしました')), timeoutMs)
      }),
    ])
  } finally {
    if (timeout !== undefined) {
      window.clearTimeout(timeout)
    }
  }
}

function firebaseAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : null
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google ログインがキャンセルされました'
  }
  if (code === 'auth/popup-blocked') {
    return 'ログイン用ポップアップがブロックされました。ブラウザでポップアップを許可してください'
  }
  return error instanceof Error ? error.message : 'Firebase にログインできませんでした'
}
