# Logikchain Software Development Lifecycle

This document defines how a change moves from an idea to production. Development starts in `dev`; the deployable lifecycle is `dev` → `test` → `prod`. Local tools may help a developer verify work, but they are not lifecycle stages and are never promotion sources.

The detailed Firebase commands and environment controls live in `constitution/Logikchain_Firebase_Workflow.md`. Architecture decisions live in `constitution/Logikchain_Architecture.md`, and the HTTP test standard lives in `constitution/Logikchain_API_Testing.md`.

---

## 1. Lifecycle

```text
specification
    → implement and verify on dev
    → pull request
    → merge the approved SHA to main
    → CI deploys that SHA to test
    → QA and UAT approve that SHA
    → tag the same SHA vX.Y.Z
    → CI deploys that tag to prod
    → monitor; roll back to the previous approved tag when required
```

Only a Git SHA is promoted. Auth users, Firestore documents, Storage objects, secrets, keys, webhook registrations, and seed data never move between environments.

## 2. Plan and specify

Before implementation, update the governing contract when the change affects behavior:

- API behavior, authorization, payloads, or errors: `constitution/Logikchain_API_Specifications.md`
- Data shapes or state transitions: `constitution/Logikchain_Data_Structures.md`
- Runtime, hosting, or client responsibility: `constitution/Logikchain_Architecture.md`
- User journeys and controls: `constitution/wireframes/`
- Financial behavior or evidence: `constitution/Logikchain_Financial_Controls.md` and `constitution/Logikchain_Financial_Traceability.md`

The implementation must follow the approved contract. A code-only change that silently creates a second contract is a defect.

## 3. Develop on `dev`

`dev` is the first lifecycle environment and the shared engineering sandbox. Developers work on feature branches and target only the `dev` Firebase project and the `dev` web and Android builds.

Before opening a pull request:

1. Build and type-check every affected runtime.
2. Run affected unit, security-rules, and API tests.
3. Exercise the changed journey against `dev` with throwaway data.
4. Confirm that no project IDs, secrets, production data, or cross-environment configuration entered the change.
5. Update constitution, wireframe, test, and operational documentation affected by the change.

Local test utilities may be used during implementation, but passing locally does not replace verification on `dev`.

## 4. Review and merge

A pull request is the review boundary. It must explain what changed, why it changed, how it was verified, and any deployment or rollback considerations.

Reviewers verify:

- conformance with the constitution and API contract;
- authorization, App Check, ownership, and official-client enforcement;
- transaction, idempotency, ledger, and audit behavior for money-affecting changes;
- test coverage and failure behavior;
- environment isolation and absence of secrets or production data.

Only an approved pull request is merged to `main`. The merge commit or approved head SHA becomes the release-candidate SHA.

## 5. Validate on `test`

Merging to `main` causes CI to build and deploy the same SHA to `test`. `test` is for integration testing, QA, UAT, and release-candidate validation; it is not a developer sandbox.

QA uses only the test PWA and test Android build. Test configuration is created within `test`; it is not copied from `dev` or `prod`.

A release candidate may advance only when:

- required automated checks pass;
- affected role journeys pass;
- money, reconciliation, custody, and period-close controls pass when affected;
- deployment and rollback behavior are understood;
- QA records approval of the exact SHA.

## 6. Release to `prod`

Create a `vX.Y.Z` tag on the exact SHA approved in `test`. The production CI workflow is the only production deployment path.

Production deployment includes the versioned Functions source, Firestore rules and indexes, Storage rules, and Hosting bundle. Production data and secrets remain in `prod`.

After deployment, verify service health and the changed critical journeys without altering unrelated production records.

## 7. Operate and roll back

Operational issues are triaged through the Support console, audit records, health checks, reconciliation, and provider dashboards.

Application rollback means CI redeploys the previous approved production tag. Do not repair a bad application release by importing data from another environment or rewriting production records outside the documented business operation.

Every follow-up change restarts at `dev`.

## 8. Environment ownership

| Environment | Purpose | Deployment authority | Exit condition |
| --- | --- | --- | --- |
| `dev` | Implementation and engineering verification | Developers through the guarded dev deployment path | Pull request approved and merged |
| `test` | Integration, QA, UAT, release candidate | CI on `main`; logged recovery only when CI is unavailable | Exact SHA approved for release |
| `prod` | Live users and live money | CI on `vX.Y.Z` tags only | Operate, or roll back to an approved tag |

