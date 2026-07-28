export const FIREBASE_AUTH_ROUTE = '/firebase-auth'
export const FIREBASE_AUTH_RETURN_PARAM = 'firebaseAuthReturn'

export function createFirebaseAuthStartUrl(location: Location = window.location): URL {
  const url = new URL(FIREBASE_AUTH_ROUTE, location.origin)
  url.searchParams.set('returnTo', `${location.pathname}${location.search}${location.hash}`)
  return url
}

export function createFirebaseAuthReturnUrl(location: Location = window.location): URL {
  const requestedReturnTo = new URLSearchParams(location.search).get('returnTo')
  let url = new URL('/pro', location.origin)
  if (requestedReturnTo?.startsWith('/')) {
    const candidate = new URL(requestedReturnTo, location.origin)
    if (candidate.origin === location.origin && candidate.pathname !== FIREBASE_AUTH_ROUTE) {
      url = candidate
    }
  }
  url.searchParams.set(FIREBASE_AUTH_RETURN_PARAM, '1')
  return url
}
