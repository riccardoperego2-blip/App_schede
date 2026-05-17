# EAS Build

Expo app: `apps/mobile` (Expo SDK 54, Expo Router).

## Prerequisites

Install and authenticate with EAS:

```bash
npm install -g eas-cli
eas login
```

Initialize/link the Expo project if this is the first EAS build:

```bash
cd apps/mobile
eas init
```

## Environment Variables

The EAS profiles set:

```text
EXPO_PUBLIC_API_URL=https://appschede-production.up.railway.app
```

Set these in EAS Environment Variables for `development`, `preview`, and `production`:

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

Do not set or expose `SUPABASE_SERVICE_ROLE_KEY` in the mobile app.

Local Expo Go development can keep using `apps/mobile/.env`, for example:

```text
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Build Commands

Run commands from `apps/mobile`:

```bash
eas build --platform android --profile development
eas build --platform android --profile preview
eas build --platform ios --profile preview
eas build --platform android --profile production
eas build --platform ios --profile production
```

Or from the monorepo root:

```bash
pnpm --filter @schede/mobile run eas:build:preview:android
pnpm --filter @schede/mobile run eas:build:preview:ios
pnpm --filter @schede/mobile run eas:build:production:android
pnpm --filter @schede/mobile run eas:build:production:ios
```
