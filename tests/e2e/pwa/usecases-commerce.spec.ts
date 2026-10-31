import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../test-data-setup';

test.describe('Commerce & Financial Core Use Cases (UC-04, UC-05, UC-06, UC-07)', () => {
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:30080';
  const DEV_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-support-admin',
    'x-client-platform': 'web',
    'x-user-role': 'support',
  };

  /**
   * UC-04: Trade Credit 2-Phase Hold & Headroom Circuit Breaker
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed merchant credit limits & headroom.
   * 2. User Sign-In: Authenticate merchant session.
   * 3. Core Business Flow: Create credit limit, reserve valid hold, assert circuit breaker 402 on over-limit, commit hold.
   * 4. Explicit User Sign-Out.
   */
  test('UC-04: Trade Credit 2-Phase Hold & Headroom Circuit Breaker', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-04');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'merchant');

    const merchantId = `mer_${Date.now()}`;
    const supplierId = 'sup_ongole_01';
    const orderId = `ord_crd_${Date.now()}`;

    // Phase 3: Core Business Flow
    // 1. Establish Credit Profile with 50,000 credit limit
    const profileRes = await page.request.post(`${GATEWAY_URL}/v1/credit/limits`, {
      headers: DEV_AUTH_HEADER,
      data: {
        merchantId,
        supplierId,
        creditLimit: 50000.0,
        riskTier: 'LOW',
      },
    });
    expect(profileRes.ok()).toBeTruthy();

    // 2. Request authorized credit hold of 15,000
    const holdRes = await page.request.post(`${GATEWAY_URL}/v1/credit/holds`, {
      headers: DEV_AUTH_HEADER,
      data: {
        merchantId,
        supplierId,
        orderId,
        amount: 15000.0,
      },
    });
    expect(holdRes.ok()).toBeTruthy();
    const holdData = await holdRes.json();
    expect(holdData.success).toBe(true);
    expect(holdData).toHaveProperty('holdId');
    expect(holdData.status).toBe('PENDING');
    expect(Number(holdData.holdAmount)).toBe(15000.0);

    // 3. Circuit Breaker Test: Request hold exceeding remaining headroom (40,000 > 35,000)
    const overLimitRes = await page.request.post(`${GATEWAY_URL}/v1/credit/holds`, {
      headers: DEV_AUTH_HEADER,
      data: {
        merchantId,
        supplierId,
        orderId: `ord_over_${Date.now()}`,
        amount: 40000.0,
      },
    });
    expect(overLimitRes.status()).toBe(402);
    const errData = await overLimitRes.json();
    expect(errData.error.code).toBe('INSUFFICIENT_CREDIT_LIMIT');

    // 4. Commit valid hold upon delivery
    const commitRes = await page.request.post(`${GATEWAY_URL}/v1/credit/holds/${holdData.holdId}/commit`, {
      headers: DEV_AUTH_HEADER,
    });
    expect(commitRes.ok()).toBeTruthy();
    const commitData = await commitRes.json();
    expect(commitData.success).toBe(true);
    expect(commitData.status).toBe('COMMITTED');
    expect(commitData.hold.status).toBe('COMMITTED');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-05: Dynamic UPI QR Intent Generation & Webhook Settlement
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed order & UPI intent configuration.
   * 2. User Sign-In: Authenticate merchant session.
   * 3. Core Business Flow: Create dynamic UPI intent with deep-link & QR, verify webhook callback capture.
   * 4. Explicit User Sign-Out.
   */
  test('UC-05: Dynamic UPI QR Intent Generation & Webhook Settlement', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-05');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'merchant');

    const orderId = `ord_upi_${Date.now()}`;

    // Phase 3: Core Business Flow
    // 1. Create Dynamic UPI Intent
    const intentRes = await page.request.post(`${GATEWAY_URL}/v1/payments/intent`, {
      headers: DEV_AUTH_HEADER,
      data: {
        orderId,
        amount: 3250.0,
        currency: 'INR',
        buyerId: 'buyer_rural_01',
        buyerVpa: 'buyer@upi',
      },
    });
    expect(intentRes.ok()).toBeTruthy();
    const intentData = await intentRes.json();
    expect(intentData.success).toBe(true);
    expect(intentData.paymentIntent).toHaveProperty('intent_id');
    expect(intentData.paymentIntent.status).toBe('CREATED');
    expect(intentData.upiLink).toContain('upi://pay');
    expect(intentData.qrString).toBeDefined();

    // 2. Simulate Webhook Settlement from Banking Partner
    const webhookRes = await page.request.post(`${GATEWAY_URL}/api/v1/payments/webhook`, {
      headers: {
        'x-webhook-signature': 'sig_mock_verified_hmac',
        'content-type': 'application/json',
      },
      data: {
        intent_id: intentData.paymentIntent.intent_id,
        status: 'SUCCESS',
        rrn: `RRN${Date.now()}`,
        id: `txn_${Date.now()}`,
      },
    });
    expect(webhookRes.ok()).toBeTruthy();
    const webhookData = await webhookRes.json();
    expect(webhookData.received).toBe(true);
    expect(webhookData.status).toBe('CAPTURED');
    expect(webhookData.intentId).toBe(intentData.paymentIntent.intent_id);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-06: End-to-End Order Creation, Vehicle Departure Gate & OTP Handover
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed wholesale consignment payload.
   * 2. User Sign-In: Authenticate merchant session.
   * 3. Core Business Flow: Place order, verify 422 on departure gate breach, clear departure with valid manifest,
   *    verify 401 on bad OTP, complete handover with master OTP.
   * 4. Explicit User Sign-Out.
   */
  test('UC-06: End-to-End Order Creation, Vehicle Departure Gate & OTP Handover', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-06');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'merchant');

    const buyerId = `buyer_${Date.now()}`;
    const merchantId = 'mer_rural_01';
    const supplierId = 'sup_ongole_01';

    // Phase 3: Core Business Flow
    // Step 1: Place wholesale Order
    const placeRes = await page.request.post(`${GATEWAY_URL}/v1/orders`, {
      headers: DEV_AUTH_HEADER,
      data: {
        buyerId,
        merchantId,
        supplierId,
        gigId: 'driver_rural_101',
        paymentType: 'PREPAID_UPI',
        totalAmount: 7800.0,
        items: [
          { sku: 'AGRI-SEED-01', name: 'Cotton Hybrid Seed 1kg', qty: 10, unitPrice: 780.0 },
        ],
        deliveryAddress: {
          village: 'Chimakurthy',
          district: 'Prakasam',
          pincode: '523226',
        },
      },
    });
    expect(placeRes.ok()).toBeTruthy();
    const orderData = await placeRes.json();
    const orderId = orderData.order.order_id;
    expect(orderId).toBeDefined();
    expect(orderData.order.status).toBe('PLACED');
    expect(orderData.otpPreview).toBeDefined();

    // Step 2: Vehicle Departure Gate - Attempt departure WITHOUT physical manifest check
    const badDepartRes = await page.request.post(`${GATEWAY_URL}/v1/orders/${orderId}/depart`, {
      headers: DEV_AUTH_HEADER,
      data: {
        driverId: 'driver_rural_101',
        vehicleRegNumber: 'AP-27-TY-1044',
        manifestChecked: false, // Tripping departure gate
      },
    });
    expect(badDepartRes.status()).toBe(422);
    const badDepartData = await badDepartRes.json();
    expect(badDepartData.error.code).toBe('VEHICLE_DEPARTURE_GATE_FAILED');

    // Step 3: Vehicle Departure Gate - Clear departure WITH verified manifest
    const goodDepartRes = await page.request.post(`${GATEWAY_URL}/v1/orders/${orderId}/depart`, {
      headers: DEV_AUTH_HEADER,
      data: {
        driverId: 'driver_rural_101',
        vehicleRegNumber: 'AP-27-TY-1044',
        manifestChecked: true,
        temperatureCheck: true,
      },
    });
    expect(goodDepartRes.ok()).toBeTruthy();
    const goodDepartData = await goodDepartRes.json();
    expect(goodDepartData.departureCleared).toBe(true);
    expect(goodDepartData.order.status).toBe('DISPATCHED_IN_TRANSIT');

    // Step 4: OTP Custody Handover Gate - Attempt delivery with incorrect OTP
    const badOtpRes = await page.request.post(`${GATEWAY_URL}/v1/orders/${orderId}/handover/otp`, {
      headers: DEV_AUTH_HEADER,
      data: {
        driverId: 'driver_rural_101',
        otpCode: '000000', // Invalid code
      },
    });
    expect(badOtpRes.status()).toBe(401);
    const badOtpData = await badOtpRes.json();
    expect(badOtpData.error.code).toBe('INVALID_HANDOVER_OTP');

    // Step 5: OTP Custody Handover Gate - Finalize custody handover with correct OTP
    const goodOtpRes = await page.request.post(`${GATEWAY_URL}/v1/orders/${orderId}/handover/otp`, {
      headers: DEV_AUTH_HEADER,
      data: {
        driverId: 'driver_rural_101',
        otpCode: '948210', // Master valid code
        signaturePod: 'DIGITAL_MERCHANT_ACK',
      },
    });
    expect(goodOtpRes.ok()).toBeTruthy();
    const goodOtpData = await goodOtpRes.json();
    expect(goodOtpData.handoverVerified).toBe(true);
    expect(goodOtpData.order.status).toBe('DELIVERED');

    // Step 6: Verify final order details via Gateway
    const finalOrderRes = await page.request.get(`${GATEWAY_URL}/v1/orders/${orderId}`, {
      headers: DEV_AUTH_HEADER,
    });
    expect(finalOrderRes.ok()).toBeTruthy();
    const finalData = await finalOrderRes.json();
    expect(finalData.order.status).toBe('DELIVERED');
    expect(finalData.handovers[0].status).toBe('VERIFIED');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-07: Order Deliverable Verification, Doorstep Rejection & 72-Hour RTO Protocol
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed deliverable policies & order.
   * 2. User Sign-In: Authenticate buyer session.
   * 3. Core Business Flow: Audit deliverable policies, initiate doorstep line-item rejection, trigger 72hr RTO.
   * 4. Explicit User Sign-Out.
   */
  test('UC-07: Order Deliverable Verification, Doorstep Rejection & 72-Hour RTO Protocol', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-07');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'buyer');

    // Phase 3: Core Business Flow
    // 1. Audit Deliverable Policies
    const policyRes = await page.request.get(`${GATEWAY_URL}/v1/orders/policies/deliverables`, {
      headers: DEV_AUTH_HEADER,
    });
    expect(policyRes.ok()).toBeTruthy();
    const policyData = await policyRes.json();
    expect(policyData.success).toBe(true);
    expect(policyData.retentionWindowHours).toBe(72);
    expect(policyData.pudoPolicy.rtoTriggerOnTimeout).toBe(true);
    expect(policyData.doorstepInspection.lineItemRejectionSupported).toBe(true);

    // 2. Create order to test doorstep rejection
    const createRes = await page.request.post(`${GATEWAY_URL}/v1/orders`, {
      headers: DEV_AUTH_HEADER,
      data: {
        buyerId: 'usr_8977848501',
        merchantId: 'mer_kandukur_01',
        supplierId: 'sup_ongole_01',
        paymentType: 'CREDIT',
        totalAmount: 18500.0,
        items: [
          { sku: 'sku_seeds_hybrid_01', name: 'Sealed Hybrid Seeds', quantity: 10, unitPrice: 850.0 },
          { sku: 'sku_pulse_dhal_01', name: 'Branded Toor Dhal', quantity: 20, unitPrice: 500.0 },
        ],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const createData = await createRes.json();
    const orderId = createData.order.order_id;
    expect(orderId).toBeDefined();

    // 3. Initiate doorstep line-item rejection before OTP signoff
    const returnRes = await page.request.post(`${GATEWAY_URL}/v1/orders/${orderId}/returns/initiate`, {
      headers: DEV_AUTH_HEADER,
      data: {
        reason: 'DAMAGED_AT_DOORSTEP',
        lineItems: [{ sku: 'sku_pulse_dhal_01', quantity: 2, condition: 'LEAKING_PACKAGE' }],
        refundAmount: 1000.0,
      },
    });
    expect(returnRes.status()).toBe(201);
    const returnData = await returnRes.json();
    expect(returnData.success).toBe(true);
    expect(returnData.returnRequest.status).toBe('INITIATED');

    // 4. Trigger automated 72-hour RTO expiration protocol
    const rtoRes = await page.request.post(`${GATEWAY_URL}/v1/orders/${orderId}/rto/trigger`, {
      headers: DEV_AUTH_HEADER,
      data: {
        triggerReason: '72_HOUR_EXPIRATION',
        reverseGigId: 'gig_reverse_circuit_01',
      },
    });
    expect(rtoRes.status()).toBe(201);
    const rtoData = await rtoRes.json();
    expect(rtoData.success).toBe(true);
    expect(rtoData.rto.status).toBe('RTO_INITIATED');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });
});
