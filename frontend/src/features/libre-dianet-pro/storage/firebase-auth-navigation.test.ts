import { describe, expect, it } from 'vitest'
import { createFirebaseAuthReturnUrl, createFirebaseAuthStartUrl, FIREBASE_AUTH_RETURN_PARAM } from './firebase-auth-navigation'

function location(url: string): Location {
  return new URL(url) as unknown as Location
}

describe('Firebase auth navigation', () => {
  it('preserves the Pro route, invitation, and hash while starting authentication', () => {
    const result = createFirebaseAuthStartUrl(location('http://127.0.0.1:5173/pro?workspaceInvite=invite-1#editor'))

    expect(result.origin).toBe('http://127.0.0.1:5173')
    expect(result.pathname).toBe('/firebase-auth')
    expect(result.searchParams.get('returnTo')).toBe('/pro?workspaceInvite=invite-1#editor')
  })

  it('returns to the requested same-origin route with an auth marker', () => {
    const result = createFirebaseAuthReturnUrl(
      location('http://127.0.0.1:5173/firebase-auth?returnTo=%2Fpro%3FworkspaceInvite%3Dinvite-1%23editor'),
    )

    expect(result.pathname).toBe('/pro')
    expect(result.searchParams.get('workspaceInvite')).toBe('invite-1')
    expect(result.searchParams.get(FIREBASE_AUTH_RETURN_PARAM)).toBe('1')
    expect(result.hash).toBe('#editor')
  })

  it.each(['//example.com/steal', '/\\example.com/steal', '/firebase-auth'])(
    'falls back to Pro for an unsafe return target: %s',
    (returnTo) => {
      const authUrl = new URL('http://127.0.0.1:5173/firebase-auth')
      authUrl.searchParams.set('returnTo', returnTo)

      const result = createFirebaseAuthReturnUrl(location(authUrl.toString()))

      expect(result.origin).toBe('http://127.0.0.1:5173')
      expect(result.pathname).toBe('/pro')
      expect(result.searchParams.get(FIREBASE_AUTH_RETURN_PARAM)).toBe('1')
    },
  )
})
