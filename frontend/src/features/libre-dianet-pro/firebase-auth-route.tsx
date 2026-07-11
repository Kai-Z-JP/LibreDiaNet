import { lazy, Suspense } from 'react'

const FirebaseAuthPage = lazy(() => import('./firebase-auth-page'))

export default function FirebaseAuthRoute() {
  return (
    <Suspense fallback={null}>
      <FirebaseAuthPage />
    </Suspense>
  )
}
