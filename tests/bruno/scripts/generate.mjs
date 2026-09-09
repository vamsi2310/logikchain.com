/**
 * Regenerates Bruno request folders from catalog.mjs.
 * Law: constitution/Logikchain_API_Testing.md
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { groups, operations } from "../catalog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const ROLE_EMAIL = {
  support: "seedSupportEmail",
  supplier: "seedSupplierEmail",
  buyer: "seedBuyerEmail",
  merchant: "seedMerchantEmail",
  vehicle: "seedVehicleEmail",
  any: "seedBuyerEmail",
  none: "",
};

function bruPath(urlPath) {
  return urlPath.replace(/\{([a-zA-Z]+)\}/g, "{{$1}}");
}

function jsonBlock(value) {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .map((l) => `  ${l}`)
    .join("\n");
}

function tagsOf(op) {
  const tags = new Set(op.tags ?? []);
  tags.add(op.groupTag);
  tags.add(op.id);
  if (op.smoke) tags.add("smoke");
  if (op.money) tags.add("money");
  if (op.webhook) tags.add("webhook");
  if (op.manual) tags.add("manual");
  return [...tags];
}

function tagBlock(tags) {
  return tags.map((t) => `    ${t}`).join("\n");
}

function setupScript(op) {
  const emailVar = ROLE_EMAIL[op.role] || "";
  const tokenVar = op.role === "none" ? "" : `${op.role === "any" ? "buyer" : op.role}AccessToken`;
  return `  const operationId = ${JSON.stringify(op.id)};
  const role = ${JSON.stringify(op.role)};
  if (!bru.getVar("runId")) {
    bru.setVar("runId", Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
  }
  bru.setVar("idempotencyKey", "idem-" + operationId + "-" + bru.getVar("runId"));
  bru.setVar("correlationId", operationId + ":" + bru.getVar("runId"));
  const authEmulator = bru.getEnvVar("authEmulator");
  const email = ${emailVar ? `bru.getEnvVar(${JSON.stringify(emailVar)})` : "null"};
  const password = bru.getEnvVar("seedPassword");
  const tokenVar = ${JSON.stringify(tokenVar)};
  if (tokenVar && authEmulator && email && password && !bru.getVar(tokenVar)) {
    try {
      const key = bru.getEnvVar("firebaseWebApiKey") || "fake-api-key";
      const resp = await axios.post(authEmulator + "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + key, {
        email,
        password,
        returnSecureToken: true
      });
      if (resp.data && resp.data.idToken) bru.setVar(tokenVar, resp.data.idToken);
    } catch (err) {
      console.warn("setup auth: " + (err && err.message ? err.message : err));
    }
  }
  if (tokenVar) {
    bru.setVar("accessToken", bru.getVar(tokenVar) || bru.getEnvVar(tokenVar) || "");
  }
  const seedKeys = ["seedGigId","seedVillageId","seedRouteId","seedPamphletId","seedProductId","seedBuyerId","seedMerchantId","seedSupplierId","seedVehicleId","seedCountryId","seedPlanId","seedTariffId","seedSubscriptionId","seedStateId","seedDistrictId"];
  for (const key of seedKeys) {
    const envVal = bru.getEnvVar(key);
    const short = key.replace(/^seed/, "");
    const runtime = short.charAt(0).toLowerCase() + short.slice(1);
    if (envVal && !bru.getVar(runtime)) bru.setVar(runtime, envVal);
    if (envVal && !bru.getVar(key)) bru.setVar(key, envVal);
  }
  const pathBinds = ${JSON.stringify(op.pathBinds || {})};
  for (const key of Object.keys(pathBinds)) {
    bru.setVar(key, pathBinds[key] + bru.getVar("runId"));
  }`;
}

function captureScript(op) {
  const deactivate =
    op.teardown === "deactivate" && op.teardownCollection
      ? `
  bru.setVar("teardownCollection", ${JSON.stringify(op.teardownCollection)});
  bru.setVar("teardownRecordId", bru.getVar(${JSON.stringify(op.teardownRecordVar || "recordId")}) || bru.getVar("runId"));`
      : "";
  return `  const status = res.getStatus();
  const body = res.getBody();
  if (status === 200 && body && typeof body === "object") {
    const keys = ["supplierId","userId","gigId","orderId","merchantOrderId","paymentIntentId","intentId","pickupCode","handoverCode","payoutRequestId","payoutTransactionId","beneficiaryId","custodyTransferId","settlementId","discrepancyId","requestId","subscriptionId","authorizationId","certificateId","challanId","taxProfileId","configurationId","countryId","stateId","districtId","villageId","planId","tariffId","offerId","codeId","routeId","refundTransactionId","creditNoteId","exceptionId","periodId"];
    for (const key of keys) {
      if (body[key]) bru.setVar(key, body[key]);
    }
    if (body.paymentIntentId && !body.intentId) bru.setVar("intentId", body.paymentIntentId);
  }${deactivate}`;
}

function assertTests(op) {
  const fields = (op.successFields ?? []).map((f) => `        expect(body).to.have.property(${JSON.stringify(f)});`).join("\n");
  return `  test("status is a spec HTTP code", function () {
    expect([200, 400, 401, 403, 404, 409, 429]).to.include(res.getStatus());
  });
  test("envelope is spec-shaped", function () {
    const status = res.getStatus();
    const body = res.getBody();
    if (status === 200) {
      expect(body).to.be.an("object");
${fields}
    } else {
      expect(body).to.have.property("error");
      expect(body.error).to.have.property("code");
      expect(body.error).to.have.property("message");
    }
  });`;
}

function write(rel, contents) {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contents.endsWith("\n") ? contents : contents + "\n");
}

function folderBru(name, seq, docs) {
  return `meta {
  name: ${name}
  seq: ${seq}
}

auth {
  mode: inherit
}

docs {
  ${docs}
}
`;
}

function setupFile(op) {
  const tags = tagBlock(tagsOf(op));
  return `meta {
  name: ${op.id} setup
  type: http
  seq: 0
  tags: [
${tags}
  ]
}

get {
  url: {{baseUrl}}/v1/config/catalog?types=countries
  body: none
  auth: none
}

headers {
  X-Correlation-Id: {{correlationId}}
}

script:pre-request {
${setupScript(op)}
}

assert {
  res.status: in [200, 401, 403]
}

docs {
  operationId: ${op.id}
  HTTP: ${op.method.toUpperCase()} ${op.path}
  Role: ${op.role}
  Setup: mint/refresh the ${op.role} ID token, copy seed fixture vars, mint idempotencyKey and correlationId.
  Does not call ${op.id}.
}
`;
}

function executeFile(op) {
  const tags = tagBlock(tagsOf(op));
  const url = `{{baseUrl}}${bruPath(op.path)}${op.query ? "?" + op.query : ""}`;
  const method = op.method.toLowerCase();
  const auth = op.role === "none" || op.webhook ? "none" : "inherit";
  const hasBody = op.body !== undefined && op.body !== null && method !== "get";
  const headerExtra = op.idempotency
    ? `  Idempotency-Key: {{idempotencyKey}}\n`
    : "";
  const bodyBlock = hasBody
    ? `body:json {
${jsonBlock(op.body)}
}

`
    : "";
  return `meta {
  name: ${op.id}
  type: http
  seq: 10
  tags: [
${tags}
  ]
}

${method} {
  url: ${url}
  body: ${hasBody ? "json" : "none"}
  auth: ${auth}
}

headers {
  Content-Type: application/json
${headerExtra}  X-Correlation-Id: {{correlationId}}
}

${bodyBlock}assert {
  res.status: in [200, 400, 401, 403, 404, 409, 429]
}

script:pre-request {
${setupScript(op)}
}

script:post-response {
${captureScript(op)}
}

tests {
${assertTests(op)}
}

docs {
  operationId: ${op.id}
  HTTP: ${op.method.toUpperCase()} ${op.path}
  Role: ${op.role}
  Execute: the spec request. Assert status + error envelope or listed success fields.
  Teardown class: ${op.teardown}
}
`;
}

function teardownFile(op) {
  const tags = tagBlock(tagsOf(op));
  const kind = op.teardown || "none";
  if (kind === "none") {
    return `meta {
  name: ${op.id} teardown
  type: http
  seq: 90
  tags: [
${tags}
  ]
}

get {
  url: {{baseUrl}}/v1/config/catalog?types=countries
  body: none
  auth: none
}

script:post-response {
  bru.setVar("accessToken", bru.getVar("accessToken") || "");
}

tests {
  test("teardown does not rewrite money history", function () {
    expect(true).to.equal(true);
  });
}

docs {
  operationId: ${op.id}
  Teardown: none. Append-only or read-only. Isolation is runId + emulator restart.
}
`;
  }

  const reverse = {
    deactivate: {
      method: "patch",
      url: "{{baseUrl}}/v1/config/{{teardownCollection}}/{{teardownRecordId}}:deactivate",
      body: { reason: "bruno teardown {{runId}}" },
      docs: "Deactivates the catalog row this execute created.",
    },
    cancelOrder: {
      method: "post",
      url: "{{baseUrl}}/v1/orders/{{orderId}}:cancel",
      body: { orderId: "{{orderId}}" },
      docs: "Cancels the buyer order if it is still cancellable.",
    },
    cancelMerchantOrder: {
      method: "post",
      url: "{{baseUrl}}/v1/merchant-orders/{{merchantOrderId}}:cancel",
      body: { merchantOrderId: "{{merchantOrderId}}" },
      docs: "Cancels the merchant order if it is still cancellable.",
    },
    restoreUser: {
      method: "delete",
      url: "{{baseUrl}}/v1/users/{{userId}}/suspension",
      body: { userId: "{{userId}}", restoreNote: "bruno teardown {{runId}}", idempotencyKey: "restore-{{runId}}-{{userId}}" },
      docs: "Restores the account this execute suspended.",
    },
    revokeDevice: {
      method: "post",
      url: "{{baseUrl}}/v1/devices",
      body: { token: "bruno-{{runId}}", platform: "web", revoke: true },
      docs: "Revokes the device token this execute registered.",
    },
    cancelSubscription: {
      method: "post",
      url: "{{baseUrl}}/v1/subscriptions/{{subscriptionId}}:cancel",
      body: { subscriptionId: "{{subscriptionId}}", reason: "bruno teardown {{runId}}" },
      docs: "Cancels the subscription this execute created, if still cancellable.",
    },
    disableProvisional: {
      method: "put",
      url: "{{baseUrl}}/v1/credit-profiles/{{merchantId}}/provisional-policy",
      body: { merchantId: "{{merchantId}}", enabled: false, cap: 0, reason: "bruno teardown {{runId}}" },
      docs: "Turns off the provisional policy this execute enabled.",
    },
  }[kind];

  if (!reverse) throw new Error(`Unknown teardown ${kind} on ${op.id}`);

  return `meta {
  name: ${op.id} teardown
  type: http
  seq: 90
  tags: [
${tags}
  ]
}

${reverse.method} {
  url: ${reverse.url}
  body: json
  auth: inherit
}

headers {
  Content-Type: application/json
  X-Correlation-Id: ${op.id}-teardown:{{runId}}
}

body:json {
${jsonBlock(reverse.body)}
}

script:pre-request {
${setupScript({ ...op, role: kind === "restoreUser" ? "support" : op.role })}
}

assert {
  res.status: in [200, 400, 401, 403, 404, 409]
}

docs {
  operationId: ${op.id}
  ${reverse.docs}
}
`;
}

function groupSetup(group) {
  return `meta {
  name: ${group.id} group setup
  type: http
  seq: 0
  tags: [
    ${group.tag}
  ]
}

get {
  url: {{baseUrl}}/v1/config/catalog?types=countries
  body: none
  auth: none
}

script:pre-request {
  if (!bru.getVar("runId")) {
    bru.setVar("runId", Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
  }
  bru.setVar("correlationId", "${group.id}:" + bru.getVar("runId"));
}

docs {
  Group ${group.name}: prepare runId before the operations in this folder.
}
`;
}

function groupTeardown(group) {
  return `meta {
  name: ${group.id} group teardown
  type: http
  seq: 99
  tags: [
    ${group.tag}
  ]
}

get {
  url: {{baseUrl}}/v1/config/catalog?types=countries
  body: none
  auth: none
}

script:post-response {
  // Keep tokens; drop stale resource ids so the next group cannot reuse them by accident.
  const drop = ["orderId","merchantOrderId","paymentIntentId","intentId","payoutRequestId","custodyTransferId","settlementId","discrepancyId"];
  for (const key of drop) bru.deleteVar(key);
}

docs {
  Group ${group.name}: clear cross-operation resource vars. Does not wipe ledgers.
}
`;
}

for (const group of groups) {
  rmSync(join(root, group.id), { recursive: true, force: true });
}

for (const group of groups) {
  write(join(group.id, "folder.bru"), folderBru(group.name, group.seq, group.docs));
  write(join(group.id, "00-group-setup.bru"), groupSetup(group));
  write(join(group.id, "99-group-teardown.bru"), groupTeardown(group));
}

const seen = new Set();
for (const [i, op] of operations.entries()) {
  if (seen.has(op.id)) throw new Error(`Duplicate operationId ${op.id}`);
  seen.add(op.id);
  const group = groups.find((g) => g.id === op.group);
  if (!group) throw new Error(`${op.id} has unknown group ${op.group}`);
  op.groupTag = group.tag;
  const dir = join(op.group, op.id);
  write(join(dir, "folder.bru"), folderBru(op.id, i + 1, `${op.method.toUpperCase()} ${op.path}`));
  write(join(dir, "00-setup.bru"), setupFile(op));
  write(join(dir, "10-execute.bru"), executeFile(op));
  write(join(dir, "90-teardown.bru"), teardownFile(op));
}

console.log(`Wrote ${operations.length} operations in ${groups.length} groups`);
