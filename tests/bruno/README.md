# Logikchain API (Bruno)

HTTP `/v1` tests. The standard is `constitution/Logikchain_API_Testing.md`.

## Run

Emulators must already be up (`functions` `npm run serve`). Seed Auth users with `emulator-only-password`.

```text
npm install
npx bru run --env emulator
npx bru run 03-orders --env emulator
npx bru run 03-orders/placeOrder --env emulator
npx bru run --env emulator --tags smoke
npx bru run --env emulator --exclude-tags webhook,manual
```

Or open this folder in Bruno Desktop and run a request, a folder, or the collection.

## Layout

Each `operationId` is a folder with `00-setup.bru`, `10-execute.bru`, and `90-teardown.bru`. Groups are `01-identity` … `15-webhooks`.

Do not point this collection at `test` or `prod`. After adding an API, edit `catalog.mjs` and run `npm run generate`.
