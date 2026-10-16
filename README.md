# Welcome to your Expo app 👋

## Authentication setup

The app requires Clerk and Convex authentication. Missing client configuration
shows a configuration message; it never enables mock accounts or shared access.
Use fresh test users until the separate legacy migration is ready. Existing
unowned Convex records and device backups are preserved, hidden, and never
automatically imported. Real Clerk profile attributes and account deletion are
separate follow-ups.

Set these public build variables in your local environment (do not commit keys):

| Variable                            | Value                                                               |
| ----------------------------------- | ------------------------------------------------------------------- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk application's publishable key                            |
| `EXPO_PUBLIC_CONVEX_URL`            | The matching Convex deployment's `.convex.cloud` URL                |
| `EXPO_PUBLIC_CONVEX_SITE_URL`       | Its `.convex.site` HTTP actions URL, used for authenticated uploads |

In the matching Convex environment, set `CLERK_JWT_ISSUER_DOMAIN` to the Clerk
Frontend API issuer URL. Create Clerk's Convex JWT template named `convex`, with
the `convex` audience. Do not put Clerk secret keys in the client environment.
See the [Convex Clerk integration](https://docs.convex.dev/auth/clerk).

In Clerk, enable email/password sign-in, email-code verification for registration,
and Google OAuth. Native registration currently requires email and password;
configure other registration fields as optional and do not require MFA for this
flow. Enable Clerk's Native API for the mobile application. Configure Google's
credentials and Clerk's allowed web origins/redirects for each environment.
Native Google sign-in uses a browser SSO flow returning to the existing
`olistplayground2` URL scheme via `Linking.createURL('/', { scheme:
'olistplayground2' })`. Use a development build on iOS/Android to verify the
registered scheme. Web uses Clerk's hosted UI components with hash routing and
returns to `/`. See [Clerk's Expo SDK](https://clerk.com/docs/reference/expo/overview).

Apply the backend functions, schema indexes, HTTP routes, and auth configuration
to an isolated test deployment using the project's normal Convex workflow, then
restart Expo after setting build variables. Signing out is in Profile → Settings.
Media uploads go through an authenticated HTTP action; arbitrary storage IDs and
previously generated unsigned upload URLs cannot register assets. Previously
issued media bearer URLs are not revoked by this change.

Run `npm test`, `npm run lint`, and `npx tsc --noEmit` for automated verification.
Tests use Convex's in-memory harness and mocked Clerk/native UI adapters; they
do not establish that a real Clerk environment or platform redirect is configured.

Before rollout, verify these cases on iOS, Android, and a browser:

| Case                       | Setup/action                                                                      | Expected result                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Email (AC-1)               | Register a fresh user, verify email, sign out, and sign in                        | Convex verifies the session; only that user's data appears                                |
| Google (AC-2)              | Complete Google SSO and restore the app/browser session                           | Return to an authenticated private workspace                                              |
| Recovery (AC-3)            | Enter a bad password or cancel Google, then retry                                 | No protected data; retry succeeds                                                         |
| Backend isolation (AC-4–7) | Run `npm test` with anonymous, A, B, and unowned fixtures                         | Every exposed operation denies unauthorized access; foreign/legacy records stay unchanged |
| Session transition (AC-8)  | Load A data and schedule a reminder, sign out during an upload, then sign in as B | No A data flash, imported backup, late write into B, or A notification                    |
| Navigation/settings (AC-9) | Open a list deep link while signed out; inspect profile/settings after sign-in    | Sign-in is required; no mock selector or shared replacement controls; sign-out works      |

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
