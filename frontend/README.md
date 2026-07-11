# React + TypeScript + Vite

## LibreDiaNet Pro storage

Pro workspaces can use one of these storage combinations:

| Selection | Pro editing data                  | GTFS SQLite                             |
| --------- | --------------------------------- | --------------------------------------- |
| Browser   | `localStorage`                    | OPFS                                    |
| Folder    | `libre-dianet-pro.workspace.json` | `gtfs/*.sqlite3` in the selected folder |
| Firebase  | RxDB replicated to Firestore      | SQLite blobs in Firebase Storage        |

Folder and Firebase SQLite databases use an OPFS working copy while open. The selected folder or Firebase Storage object remains the portable canonical copy. Switching storage with **Copy current data** copies both the Pro store and every available SQLite cache; the source is left intact.

### Firebase configuration

Copy the variables from `.env.example` into a local Vite environment file and fill them with the Firebase web app configuration. Enable Firestore, Firebase Storage, and Google Authentication, then add the deployed application origin to Authentication's authorized domains. Each Firebase workspace has an owner and editor members. Owners can issue a seven-day, email-restricted invitation URL from the storage dialog. Accepted workspaces are indexed under the signed-in user so they can be reopened on another device.

The Pro application requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` for SQLite/WASM. Firebase popup authentication runs through `/firebase-auth`, whose document response must omit both headers so the popup can communicate with the Firebase authentication helper. The Vite development and preview servers apply this split automatically; production hosting must preserve the same path-specific header behavior.

Workspace metadata, members, and RxDB documents live under `libreDiaNetProWorkspaces/{workspaceId}`. User workspace indexes live under `libreDiaNetProUsers/{uid}/workspaces`, and email-restricted invitations live under `libreDiaNetProWorkspaceInvites`. Firestore rules, indexes, Storage rules, emulator ports, and the `libre-dianet` project alias are version-controlled in `firebase.json`, `.firebaserc`, and `firebase/`. Deploy the complete backend policy from the `frontend` directory with `pnpm firebase:deploy`. The rules restrict workspace data and SQLite objects to members; only owners can create invitations.

Use `pnpm firebase:deploy:check` to compile and validate the version-controlled Firebase configuration without releasing it.

The first interactive Storage rules deployment grants `roles/firebaserules.firestoreServiceAgent` to the project's Storage service agent. This IAM role is required because Storage authorization checks workspace membership with `firestore.exists()`.

Browser-side `getBytes()` downloads also require bucket CORS configuration. Apply the version-controlled `firebase/storage.cors.json` with `pnpm firebase:storage:cors:apply`, and inspect the active configuration with `pnpm firebase:storage:cors:show`. CORS permits browser transport only; Firebase Authentication and Storage Rules continue to authorize every object request.

Run `pnpm firebase:emulators` for local Auth, Firestore, and Storage emulators. The emulator command uses the isolated `demo-libre-dianet` project ID and never writes to production.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
