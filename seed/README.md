# Development seed data (not for production)

This folder holds mock configuration and user fixtures for local development and the Firebase Emulator only.

**This folder belongs to the `emulator` playbook only** (`constitution/Logikchain_Firebase_Workflow.md` §4). Do not import, bundle, or deploy these files into `dev`, `test`, or `prod`. `dev` may have throwaway Support-created records; it still does not run a seed import. `test` and `prod` receive geography and plans only through Support Config functions on that alias.

| File | Use |
| --- | --- |
| `Logikchain_Seed_Data.md` | Sample Countries, States, Districts, subscription catalog, hubs, routes, and mock user profiles. Stored as Markdown for Google AI Studio; heading `# Content type: JSON` marks the body as JSON. |

Production and `test` geographic and subscription records must be created by approved Support users through the Config Firebase Functions (`upsertCountry`, `upsertState`, `upsertDistrict`, `upsertSubscriptionPlan`, and related APIs).

The prices in the plan tariffs are placeholders for the emulator and carry no commercial meaning. The finance `entitlements` and `entitlementLimits` on each plan, by contrast, follow the safe default mapping in [Logikchain_Financial_Controls.md](../constitution/Logikchain_Financial_Controls.md) §9.4 and should be kept in step with it, because those keys are what server functions check.
