import type { ProVersion } from '../../../types'
import { decodeFirebaseVersionDocument, encodeFirebaseVersionDocument, type FirebaseVersionDocument } from './firebase-pro-workspace-codec'

describe('Firebase Pro workspace codec', () => {
  it('round-trips excluded stop patterns without nested Firestore arrays', () => {
    const version: ProVersion = {
      id: 'version',
      name: 'Version',
      revisionDate: '2026-04-01',
      gtfsSources: [],
      presets: [
        {
          id: 'preset',
          name: 'Preset',
          index: 0,
          sourceIds: [],
          routes: [],
          routeDisplayOverrides: [],
          poles: [],
          excludedStopPatterns: [['source::pattern'], ['one', 'two']],
        },
      ],
    }
    const document: FirebaseVersionDocument = {
      id: 'document',
      workspaceId: 'workspace',
      position: 0,
      version,
    }

    const encoded = encodeFirebaseVersionDocument(document)
    const encodedPatterns = encoded.version.presets[0]?.excludedStopPatterns as unknown

    expect(encodedPatterns).toEqual([{ values: ['source::pattern'] }, { values: ['one', 'two'] }])
    expect(decodeFirebaseVersionDocument(encoded)).toEqual(document)
  })
})
