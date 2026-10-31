import type { UseCaseTestData } from './types';

export const TIER6_REFUNDS_CREDIT_TEST_DATA: Record<string, UseCaseTestData> = {
  'UC-29': {
    useCaseId: 'UC-29',
    title: 'Automated Payment Refund & GST Credit Note Issuance',
    tier: 'Tier 6: Returns, Refunds & Advanced Credit',
    category: 'business',
    epic: 'EPIC-05',
    featureId: 'FEAT-05.03',
    actor: 'support',
    source: {
      datastore: 'PostgreSQL payments_db.refunds & finance_db.credit_notes',
      microservice: 'payment-service (:4005) & finance-service (:4009)',
      syncTarget: 'Cloud Firestore /Refunds/{refundId}',
      apiEndpoint: 'POST /v1/payments/refunds',
      authMechanism: 'Support / Financial Mutation Authorized Token',
      seedFile: 'tests/e2e/data/tier6-refunds-credit.data.ts',
    },
    seedValues: {
      orderId: 'ord_cancelled_8812',
      refundAmount: 1450.0,
      cancellationReason: 'ORDER_CANCELLED_BY_CUSTOMER',
      creditNoteFormat: 'CN-2026-004812',
      originalPaymentMode: 'UPI',
    },
    expectedOutcomes: {
      refundInitiated: true,
      creditNoteGenerated: true,
      ledgerRefundBalanced: true,
    },
  },

  'UC-30': {
    useCaseId: 'UC-30',
    title: 'Credit Repayment Settlement, Statement Generation & Post-Due Relief',
    tier: 'Tier 6: Returns, Refunds & Advanced Credit',
    category: 'business',
    epic: 'EPIC-08',
    featureId: 'FEAT-08.03',
    actor: 'merchant',
    source: {
      datastore: 'PostgreSQL credit_db.repayments & credit_db.statements',
      microservice: 'credit-service (:4008)',
      syncTarget: 'Cloud Firestore /CreditStatements/{merchantId}',
      apiEndpoint: 'POST /v1/credit/repay',
      authMechanism: 'Kirana Merchant Token',
      seedFile: 'tests/e2e/data/tier6-refunds-credit.data.ts',
    },
    seedValues: {
      merchantId: 'mer_rural_01',
      supplierId: 'sup_ongole_01',
      repaymentAmount: 5000.0,
      repaymentChannel: 'UPI',
      reliefExtensionDays: 14,
    },
    expectedOutcomes: {
      creditLimitRestored: true,
      statementGenerated: true,
      overdueFlagCleared: true,
    },
  },

  'UC-31': {
    useCaseId: 'UC-31',
    title: 'Trade Credit Agreement Acceptance, Aging Ledger & Default Lockdown',
    tier: 'Tier 6: Returns, Refunds & Advanced Credit',
    category: 'business',
    epic: 'EPIC-08',
    featureId: 'FEAT-08.04',
    actor: 'merchant',
    source: {
      datastore: 'PostgreSQL credit_db.credit_agreements & aging_ledgers',
      microservice: 'credit-service (:4008)',
      syncTarget: 'Cloud Firestore /CreditAgreements/{merchantId}',
      apiEndpoint: 'POST /v1/credit/agreements/accept',
      authMechanism: 'Kirana Merchant Digital Consent Signature',
      seedFile: 'tests/e2e/data/tier6-refunds-credit.data.ts',
    },
    seedValues: {
      merchantId: 'mer_rural_01',
      supplierId: 'sup_ongole_01',
      agreementTermsVersion: 'v2.1',
      revolvingCycleDays: 14,
      agingBuckets: ['CURRENT', '1_30_DAYS', '31_60_DAYS', '60_PLUS_DEFAULT'],
      defaultLockdownReason: 'EXCEEDED_MAX_OVERDUE_WINDOW',
    },
    expectedOutcomes: {
      agreementSigned: true,
      agingBucketMapped: true,
      defaultLockdownEnforcedOnOverdue: true,
    },
  },
};

