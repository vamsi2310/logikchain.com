import type { Page } from '@playwright/test';
import type { UseCaseTestData } from './types';
import { TIER1_IDENTITY_TEST_DATA } from './tier1-identity.data';
import { TIER2_COMMERCE_TEST_DATA } from './tier2-commerce.data';
import { TIER3_CUSTODY_TEST_DATA } from './tier3-custody.data';
import { TIER4_GOVERNANCE_TEST_DATA } from './tier4-governance.data';
import { TIER5_PLATFORM_TEST_DATA } from './tier5-platform.data';
import { TIER6_REFUNDS_CREDIT_TEST_DATA } from './tier6-refunds-credit.data';

export * from './types';
export { TIER1_IDENTITY_TEST_DATA } from './tier1-identity.data';
export { TIER2_COMMERCE_TEST_DATA } from './tier2-commerce.data';
export { TIER3_CUSTODY_TEST_DATA } from './tier3-custody.data';
export { TIER4_GOVERNANCE_TEST_DATA } from './tier4-governance.data';
export { TIER5_PLATFORM_TEST_DATA } from './tier5-platform.data';
export { TIER6_REFUNDS_CREDIT_TEST_DATA } from './tier6-refunds-credit.data';

/**
 * Master Registry of all Use Case Test Data
 */
export const ALL_USE_CASES_TEST_DATA: Record<string, UseCaseTestData> = {
  ...TIER1_IDENTITY_TEST_DATA,
  ...TIER2_COMMERCE_TEST_DATA,
  ...TIER3_CUSTODY_TEST_DATA,
  ...TIER4_GOVERNANCE_TEST_DATA,
  ...TIER5_PLATFORM_TEST_DATA,
  ...TIER6_REFUNDS_CREDIT_TEST_DATA,
};

/**
 * Retrieve all registered Business Use Cases
 */
export function getBusinessUseCasesTestData(): UseCaseTestData[] {
  return Object.values(ALL_USE_CASES_TEST_DATA).filter((d) => d.category === 'business');
}

/**
 * Retrieve all registered Technical Capability Use Cases
 */
export function getTechnicalUseCasesTestData(): UseCaseTestData[] {
  return Object.values(ALL_USE_CASES_TEST_DATA).filter((d) => d.category === 'technical');
}

/**
 * Retrieve the typed test data definition for a given use case.
 */
export function getUseCaseTestData(useCaseId: string): UseCaseTestData {
  const data = ALL_USE_CASES_TEST_DATA[useCaseId];
  if (!data) {
    throw new Error(`[TestData] No test data registered for use case: "${useCaseId}". Ensure it is defined in tests/e2e/data/!`);
  }
  return data;
}

/**
 * Executes standardized Test Data Load for an individual use case run.
 * Injects required seed values, IDs, tokens, and storage state into the browser page context.
 */
export async function loadUseCaseTestData(page: Page, useCaseId: string): Promise<UseCaseTestData> {
  const testData = getUseCaseTestData(useCaseId);

  // Synchronize backend role for primary test identity usr_8977848501
  const targetBackendRole =
    testData.actor === 'merchant'
      ? 'merchant'
      : testData.actor === 'driver'
      ? 'vehicle'
      : 'buyer';

  try {
    await fetch('http://localhost:30080/v1/buyers/usr_8977848501/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer dev-token:usr_8977848501:support',
      },
      body: JSON.stringify({ targetRole: targetBackendRole }),
    });
  } catch {}

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((data) => {
    // 1. Inject usecase metadata
    localStorage.setItem('lc_active_usecase', data.useCaseId);
    localStorage.setItem('lc_active_usecase_title', data.title);
    localStorage.setItem('lc_active_usecase_tier', data.tier);
    localStorage.setItem('lc_active_usecase_source', JSON.stringify(data.source));

    // 2. Clear or set persona session state based on actor
    if (
      data.useCaseId === 'UC-01' ||
      data.useCaseId === 'UC-01A' ||
      data.useCaseId === 'UC-01I' ||
      data.useCaseId === 'UC-01J' ||
      data.useCaseId === 'UC-01K'
    ) {
      // Start in clean unauthenticated state for phone signup / OTP / lockout flows
      localStorage.removeItem('lc_test_role');
      localStorage.removeItem('lc_dev_token');
      localStorage.removeItem('lc_session_user');
      localStorage.removeItem('lc_support_supplier_context');
    } else if (data.actor === 'sre') {
      localStorage.removeItem('lc_session_user');
      localStorage.setItem('lc_test_role', 'sre_admin');
      localStorage.setItem('lc_dev_token', 'dev-token:test_sre_01:sre_admin');
    } else if (data.actor === 'support' || data.actor === 'admin') {
      localStorage.removeItem('lc_session_user');
      localStorage.setItem('lc_test_role', 'support');
      localStorage.setItem('lc_dev_token', 'dev-token:test_operator_01:support');
    } else if (data.actor === 'finance') {
      localStorage.removeItem('lc_session_user');
      localStorage.setItem('lc_test_role', 'support');
      localStorage.setItem('lc_dev_token', 'dev-token:test_finance_01:support');
    } else if (data.actor === 'driver') {
      localStorage.setItem('lc_test_role', 'driver');
      localStorage.setItem('lc_dev_token', 'dev-token:drv_ongole_01:driver');
      localStorage.setItem(
        'lc_session_user',
        JSON.stringify({
          uid: 'drv_ongole_01',
          name: 'Rural Transporter',
          phone: '+919876543211',
          role: 'vehicle',
          status: 'approved',
        })
      );
    } else if (data.actor === 'supplier') {
      localStorage.setItem('lc_test_role', 'supplier');
      localStorage.setItem('lc_dev_token', 'dev-token:sup_ongole_01:supplier');
      localStorage.setItem(
        'lc_session_user',
        JSON.stringify({
          uid: 'sup_ongole_01',
          name: 'Wholesale Mill Supplier',
          phone: '+919876543212',
          role: 'supplier',
          status: 'approved',
        })
      );
    } else if (data.actor === 'merchant') {
      localStorage.setItem('lc_test_role', 'merchant');
      localStorage.setItem('lc_dev_token', 'dev-token:usr_8977848501:merchant');
      localStorage.setItem(
        'lc_session_user',
        JSON.stringify({
          uid: 'usr_8977848501',
          name: 'Kirana Merchant',
          phone: '8977848501',
          role: 'merchant',
          status: 'approved',
        })
      );
    } else {
      localStorage.setItem('lc_test_role', 'buyer');
      localStorage.setItem('lc_dev_token', 'dev-token:usr_8977848501:buyer');
      localStorage.setItem(
        'lc_session_user',
        JSON.stringify({
          uid: 'usr_8977848501',
          name: 'Consumer Buyer',
          phone: '8977848501',
          role: 'buyer',
          status: 'approved',
        })
      );
    }

    // 3. Inject concrete seed values into test state storage
    if (data.seedValues) {
      localStorage.setItem(`lc_test_data_${data.useCaseId}`, JSON.stringify(data.seedValues));
      if (data.seedValues.targetSupplierId || data.seedValues.supplierId) {
        localStorage.setItem(
          'lc_test_supplier_id',
          data.seedValues.targetSupplierId || data.seedValues.supplierId
        );
      }
      if (data.seedValues.villageId) {
        localStorage.setItem('lc_test_village_id', data.seedValues.villageId);
      }
    }
  }, testData);

  return testData;
}

