# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: business\usecases-identity-business.spec.ts >> Business Identity & Multi-Persona Onboarding >> UC-01C: Fleet Transporter / Driver Signup, Vehicle Onboarding & Mobile PWA Ingress
- Location: tests\e2e\pwa\business\usecases-identity-business.spec.ts:138:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('[data-testid="assigned-role-text"]')
Expected pattern: /Fleet Rider/i
Received string:  "Consumer / Buyer"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('[data-testid="assigned-role-text"]') with timeout 5000ms
  - waiting for locator('[data-testid="assigned-role-text"]')
    14 × locator resolved to <span data-testid="assigned-role-text">Consumer / Buyer</span>
       - unexpected value "Consumer / Buyer"

```

```yaml
- text: Consumer / Buyer
```

# Test source

```ts
  50  | 
  51  |     const pincodeInput = page.locator('input[placeholder*="560001"]');
  52  |     if (await pincodeInput.isVisible().catch(() => false)) {
  53  |       await pincodeInput.fill('523273');
  54  |     }
  55  | 
  56  |     // Enter rural mobile number
  57  |     const phoneInput = page.locator('input[type="tel"]');
  58  |     await expect(phoneInput).toBeVisible();
  59  |     await phoneInput.fill('8977848501');
  60  | 
  61  |     // Request OTP
  62  |     const sendOtpBtn = page.getByRole('button', { name: /Send.*OTP/i });
  63  |     await expect(sendOtpBtn).toBeVisible();
  64  |     await sendOtpBtn.click();
  65  | 
  66  |     // Verify transition to OTP verification screen
  67  |     await expect(page).toHaveURL(/\/login\/verify/);
  68  | 
  69  |     // Enter 6-digit cryptographic OTP 123123
  70  |     const codeDigits = ['1', '2', '3', '1', '2', '3'];
  71  |     for (let i = 0; i < 6; i++) {
  72  |       const digitInput = page.locator(`[data-testid="otp-digit-${i}"]`);
  73  |       await expect(digitInput).toBeVisible();
  74  |       await digitInput.fill(codeDigits[i]);
  75  |     }
  76  | 
  77  |     // Submit OTP verification
  78  |     const verifyBtn = page.locator('[data-testid="verify-otp-btn"]');
  79  |     await expect(verifyBtn).toBeVisible();
  80  |     await verifyBtn.click();
  81  | 
  82  |     // Phase 3: Core Business Flow (Verify Authenticated Session & Navigation)
  83  |     await expect(page).toHaveURL(/\/login/);
  84  |     await expect(page.getByText(/You are Signed In/i)).toBeVisible();
  85  | 
  86  |     const assignedRole = page.locator('[data-testid="assigned-role-text"]');
  87  |     await expect(assignedRole).toContainText(/Consumer \/ Buyer/i);
  88  | 
  89  |     // Click "Open App ➔" to verify buyer routing
  90  |     const openAppBtn = page.getByRole('button', { name: /Open App/i });
  91  |     await expect(openAppBtn).toBeVisible();
  92  |     await openAppBtn.click();
  93  | 
  94  |     // Verify buyer landing page
  95  |     await expect(page).toHaveURL(/\/home/);
  96  | 
  97  |     // Phase 4: Explicit User Sign-Out
  98  |     await performUserSignOut(page);
  99  |     await expect(page.getByText(/Sign In or Register/i)).toBeVisible();
  100 |   });
  101 | 
  102 | // ───────────────────────────────────────────────────────────────────────────
  103 |   // UC-01B: Kirana Merchant Registration, Retail Profiling & Fullscreen Corridor Ingress
  104 |   // ───────────────────────────────────────────────────────────────────────────
  105 |   test('UC-01B: Kirana Merchant Registration, Retail Profiling & Fullscreen Corridor Ingress', async ({ page }) => {
  106 |     // Phase 1: Test Data Setup
  107 |     await setupUseCaseTestData(page, 'UC-01B');
  108 | 
  109 |     // Phase 2: User Sign-In (Merchant Credentials)
  110 |     await performUserSignIn(page, 'merchant');
  111 | 
  112 |     // Phase 3: Core Business Flow (Corridor Ingress & Handover)
  113 |     await page.goto('/login', { waitUntil: 'domcontentloaded' });
  114 |     await expect(page.getByText(/You are Signed In/i)).toBeVisible({ timeout: 10000 });
  115 | 
  116 |     const roleBadge = page.locator('[data-testid="assigned-role-text"]');
  117 |     await expect(roleBadge).toContainText(/Kirana Merchant/i);
  118 | 
  119 |     // Launch fullscreen corridor
  120 |     await page.getByRole('button', { name: /Open App/i }).click();
  121 |     await expect(page).toHaveURL(/\/m\/gigs/);
  122 | 
  123 |     // Verify fullscreen corridor header and Close App handover button
  124 |     const closeAppBtn = page.locator('button:has-text("✕ Close App")');
  125 |     await expect(closeAppBtn).toBeVisible({ timeout: 10000 });
  126 | 
  127 |     // Use Close App handover button to return cleanly to public website
  128 |     await closeAppBtn.click();
  129 |     await expect(page).toHaveURL(/\/(\?.*)?$/);
  130 | 
  131 |     // Phase 4: Explicit User Sign-Out
  132 |     await performUserSignOut(page);
  133 |   });
  134 | 
  135 | // ───────────────────────────────────────────────────────────────────────────
  136 |   // UC-01C: Fleet Transporter / Driver Signup, Vehicle Onboarding & Mobile PWA Ingress
  137 |   // ───────────────────────────────────────────────────────────────────────────
  138 |   test('UC-01C: Fleet Transporter / Driver Signup, Vehicle Onboarding & Mobile PWA Ingress', async ({ page }) => {
  139 |     // Phase 1: Test Data Setup
  140 |     await setupUseCaseTestData(page, 'UC-01C');
  141 | 
  142 |     // Phase 2: User Sign-In (Driver Credentials)
  143 |     await performUserSignIn(page, 'driver');
  144 | 
  145 |     // Phase 3: Core Business Flow (Driver PWA Ingress & Telemetry)
  146 |     await page.goto('/login', { waitUntil: 'domcontentloaded' });
  147 |     await expect(page.getByText(/You are Signed In/i)).toBeVisible({ timeout: 10000 });
  148 | 
  149 |     const roleBadge = page.locator('[data-testid="assigned-role-text"]');
> 150 |     await expect(roleBadge).toContainText(/Fleet Rider/i);
      |                             ^ Error: expect(locator).toContainText(expected) failed
  151 | 
  152 |     // Navigate to driver corridor
  153 |     await page.goto('/d/gigs', { waitUntil: 'domcontentloaded' });
  154 |     await expect(page).toHaveURL(/\/d\/gigs/);
  155 | 
  156 |     // Verify driver screen container rendered
  157 |     const driverBody = page.locator('body');
  158 |     await expect(driverBody).toBeVisible();
  159 | 
  160 |     // Verify backend driver custody endpoint is operational
  161 |     const custodyRes = await page.request.get('http://localhost:30080/v1/cash/summary/drv_ongole_01', {
  162 |       headers: { Authorization: 'Bearer dev-token:drv_ongole_01:driver' },
  163 |     });
  164 |     expect(custodyRes.status()).toBe(200);
  165 | 
  166 |     // Phase 4: Explicit User Sign-Out
  167 |     await performUserSignOut(page);
  168 |   });
  169 | 
  170 | // ───────────────────────────────────────────────────────────────────────────
  171 |   // UC-01D: Regional Mill Supplier Enterprise Registration, GSTIN Validation & Depot Portal Ingress
  172 |   // ───────────────────────────────────────────────────────────────────────────
  173 |   test('UC-01D: Regional Mill Supplier Enterprise Registration, GSTIN Validation & Depot Portal Ingress', async ({ page }) => {
  174 |     // Phase 1: Test Data Setup
  175 |     await setupUseCaseTestData(page, 'UC-01D');
  176 | 
  177 |     // Phase 2: User Sign-In (Supplier Credentials)
  178 |     await performUserSignIn(page, 'supplier');
  179 | 
  180 |     // Phase 3: Core Business Flow (Supplier Portal Ingress & Catalog Management)
  181 |     await page.goto('/suppliers', { waitUntil: 'domcontentloaded' });
  182 |     await expect(page).toHaveURL(/\/suppliers/);
  183 | 
  184 |     // Verify supplier landing headline
  185 |     await expect(page.getByRole('heading', { name: /Suppliers/i })).toBeVisible();
  186 | 
  187 |     // Verify supplier funds summary & escrow ledger from backend
  188 |     const orgRes = await page.request.get('http://localhost:30080/v1/payouts/suppliers/sup_ongole_01/funds-summary', {
  189 |       headers: { Authorization: 'Bearer dev-token:sup_ongole_01:supplier' },
  190 |     });
  191 |     expect(orgRes.status()).toBe(200);
  192 | 
  193 |     // Phase 4: Explicit User Sign-Out
  194 |     await performUserSignOut(page);
  195 |   });
  196 | 
  197 | // ───────────────────────────────────────────────────────────────────────────
  198 |   // UC-01H: Progressive Role Elevation with Operations Desk Verification
  199 |   // ───────────────────────────────────────────────────────────────────────────
  200 |   test('UC-01H: Progressive Role Elevation (Buyer to Merchant) with Operations Desk Verification', async ({ page }) => {
  201 |     // Phase 1: Test Data Setup
  202 |     await setupUseCaseTestData(page, 'UC-01H');
  203 | 
  204 |     // Phase 2: User Sign-In (Buyer Credentials)
  205 |     await performUserSignIn(page, 'buyer');
  206 | 
  207 |     // Phase 3: Core Business Flow (Role Elevation Form Submission)
  208 |     await page.goto('/login', { waitUntil: 'domcontentloaded' });
  209 |     await expect(page.getByText(/You are Signed In/i)).toBeVisible({ timeout: 10000 });
  210 | 
  211 |     // Open Role Switch Form
  212 |     const contactSupportBtn = page.locator('[data-testid="contact-support-role-btn"]');
  213 |     await expect(contactSupportBtn).toBeVisible();
  214 |     await contactSupportBtn.click();
  215 | 
  216 |     const roleForm = page.locator('[data-testid="role-switch-form"]');
  217 |     await expect(roleForm).toBeVisible();
  218 | 
  219 |     // Select Kirana Merchant
  220 |     await page.locator('[data-testid="role-switch-select"]').selectOption('merchant');
  221 |     await page.locator('[data-testid="role-switch-reason"]').fill('Kirana store owner requesting terminal access.');
  222 | 
  223 |     // Submit request calling backend identity microservice
  224 |     await page.locator('[data-testid="submit-role-switch-btn"]').click();
  225 | 
  226 |     // Verify role upgrade reflected in UI
  227 |     const assignedRoleText = page.locator('[data-testid="assigned-role-text"]');
  228 |     await expect(assignedRoleText).toContainText(/Kirana Merchant/i);
  229 | 
  230 |     // Phase 4: Explicit User Sign-Out
  231 |     await performUserSignOut(page);
  232 |   });
  233 | 
  234 | // ───────────────────────────────────────────────────────────────────────────
  235 |   // UC-01I: Multilingual Regional Dialect Selection (6 Languages) & Voice-Prompt Onboarding
  236 |   // ───────────────────────────────────────────────────────────────────────────
  237 |   test('UC-01I: Multilingual Regional Dialect Selection (6 Languages) & Voice-Prompt Onboarding', async ({ page }) => {
  238 |     // Phase 1: Test Data Setup
  239 |     await setupUseCaseTestData(page, 'UC-01I');
  240 | 
  241 |     // Phase 2: User Accesses Language Screen
  242 |     await page.goto('/language', { waitUntil: 'domcontentloaded' });
  243 | 
  244 |     // Phase 3: Core Business Flow (Select Telugu Dialect)
  245 |     const teluguOption = page.locator('div:has-text("తెలుగు")').last();
  246 |     await expect(teluguOption).toBeVisible();
  247 |     await teluguOption.click();
  248 | 
  249 |     // Click Save & Continue
  250 |     const saveBtn = page.getByRole('button', { name: /Save.*Continue/i });
```