# Content type: JSON

{
  "countries": [
    {
      "id": "country_in",
      "name": "India",
      "isoCode": "IN",
      "isoCode3": "IND",
      "numericCode": "356",
      "mobilePrefix": "+91",
      "phoneNumberLength": 10,
      "phoneValidationRegex": "^\\+91[0-9]{10}$",
      "currencyCode": "INR",
      "currencySymbol": "₹",
      "timezone": "Asia/Kolkata",
      "status": "active",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    }
  ],
  "states": [
    {
      "id": "state_ap",
      "countryId": "country_in",
      "name": "Andhra Pradesh",
      "code": "AP",
      "status": "active",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    }
  ],
  "districts": [
    {
      "id": "district_prakasam",
      "countryId": "country_in",
      "stateId": "state_ap",
      "name": "Prakasam",
      "code": "PRA",
      "status": "active",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    }
  ],
  "subscriptionPlans": [
    {
      "id": "plan_starter_supplier",
      "name": "Starter",
      "description": "Entry plan for a single-hub supplier launching rural routes.",
      "targetRole": "supplier",
      "status": "active",
      "features": [
        "1 hub",
        "3 routes",
        "20 gigs per month",
        "10 merchants",
        "5 drivers",
        "Payment and payout history with 12-month statements"
      ],
      "maxHubs": 1,
      "maxRoutes": 3,
      "maxGigsPerMonth": 20,
      "maxMerchants": 10,
      "maxDrivers": 5,
      "entitlements": [
        "finance.dashboard",
        "finance.transaction_history",
        "finance.statements"
      ],
      "entitlementLimits": {
        "finance.report_history_days": 365,
        "finance.exports_per_month": 0,
        "finance.scheduled_reports": 0,
        "finance.reconciliation_rows_per_month": 0,
        "finance.retained_periods": 12
      },
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "plan_growth_supplier",
      "name": "Growth",
      "description": "Multi-hub plan for expanding supplier networks.",
      "targetRole": "supplier",
      "status": "active",
      "features": [
        "5 hubs",
        "20 routes",
        "200 gigs per month",
        "50 merchants",
        "25 drivers",
        "Merchant ageing, driver payout analysis and cash-flow reports",
        "Custom date ranges, CSV and PDF exports, scheduled reports"
      ],
      "maxHubs": 5,
      "maxRoutes": 20,
      "maxGigsPerMonth": 200,
      "maxMerchants": 50,
      "maxDrivers": 25,
      "entitlements": [
        "finance.dashboard",
        "finance.transaction_history",
        "finance.statements",
        "finance.custom_date_range",
        "finance.advanced_reports",
        "finance.exports",
        "finance.scheduled_reports"
      ],
      "entitlementLimits": {
        "finance.report_history_days": 1095,
        "finance.exports_per_month": 10,
        "finance.scheduled_reports": 3,
        "finance.reconciliation_rows_per_month": 0,
        "finance.retained_periods": 36
      },
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "plan_enterprise_supplier",
      "name": "Enterprise",
      "description": "Unlimited operational caps for large regional suppliers.",
      "targetRole": "supplier",
      "status": "active",
      "features": [
        "Unlimited hubs",
        "Unlimited routes",
        "Unlimited gigs",
        "Dedicated support",
        "Reconciliation workspace and settlement exception management",
        "Period close with downloadable evidence pack",
        "GST and TDS filing packs",
        "96-month history, 100 exports and 20 scheduled reports a month"
      ],
      "entitlements": [
        "finance.dashboard",
        "finance.transaction_history",
        "finance.statements",
        "finance.custom_date_range",
        "finance.advanced_reports",
        "finance.exports",
        "finance.scheduled_reports",
        "finance.settlement_register",
        "finance.reconciliation",
        "finance.tax_reports",
        "finance.period_close"
      ],
      "entitlementLimits": {
        "finance.report_history_days": 2920,
        "finance.exports_per_month": 100,
        "finance.scheduled_reports": 20,
        "finance.reconciliation_rows_per_month": -1,
        "finance.retained_periods": 96
      },
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "plan_basic_merchant",
      "name": "Basic",
      "description": "Entry plan for a shop buying on credit from one supplier.",
      "targetRole": "merchant",
      "status": "active",
      "features": [
        "Credit balance, dues and repayments",
        "Bulk-order payments and receipts",
        "GST invoices and credit notes",
        "12-month payment history and statement"
      ],
      "entitlements": [
        "finance.dashboard",
        "finance.transaction_history",
        "finance.statements"
      ],
      "entitlementLimits": {
        "finance.report_history_days": 365,
        "finance.exports_per_month": 0,
        "finance.scheduled_reports": 0,
        "finance.retained_periods": 12
      },
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "plan_finance_merchant",
      "name": "Finance",
      "description": "For merchants managing credit across seasons and needing their own numbers.",
      "targetRole": "merchant",
      "status": "active",
      "features": [
        "Everything in Basic",
        "Ageing and repayment allocation",
        "Cash-flow and supplier-spend reports",
        "Custom date ranges",
        "CSV and PDF exports"
      ],
      "entitlements": [
        "finance.dashboard",
        "finance.transaction_history",
        "finance.statements",
        "finance.custom_date_range",
        "finance.advanced_reports",
        "finance.exports"
      ],
      "entitlementLimits": {
        "finance.report_history_days": 1095,
        "finance.exports_per_month": 10,
        "finance.scheduled_reports": 0,
        "finance.retained_periods": 36
      },
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "plan_pro_merchant",
      "name": "Pro",
      "description": "For multi-outlet merchants who file their own returns.",
      "targetRole": "merchant",
      "status": "active",
      "features": [
        "Everything in Finance",
        "Scheduled reports",
        "GST purchase pack",
        "UPI, credit and cash tie-up",
        "96-month history and 50 exports a month"
      ],
      "entitlements": [
        "finance.dashboard",
        "finance.transaction_history",
        "finance.statements",
        "finance.custom_date_range",
        "finance.advanced_reports",
        "finance.exports",
        "finance.settlement_register",
        "finance.scheduled_reports",
        "finance.tax_reports"
      ],
      "entitlementLimits": {
        "finance.report_history_days": 2920,
        "finance.exports_per_month": 50,
        "finance.scheduled_reports": 5,
        "finance.retained_periods": 96
      },
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    }
  ],
  "planTariffs": [
    {
      "id": "tariff_starter_monthly_in",
      "planId": "plan_starter_supplier",
      "name": "Starter Monthly INR",
      "billingCycle": "monthly",
      "currencyCode": "INR",
      "countryId": "country_in",
      "basePrice": 999,
      "tariffType": "flat",
      "gstRate": 18,
      "status": "active",
      "effectiveFrom": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "tariff_starter_annual_in",
      "planId": "plan_starter_supplier",
      "name": "Starter Annual INR",
      "billingCycle": "annual",
      "currencyCode": "INR",
      "countryId": "country_in",
      "basePrice": 9999,
      "tariffType": "flat",
      "gstRate": 18,
      "status": "active",
      "effectiveFrom": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "tariff_growth_monthly_in",
      "planId": "plan_growth_supplier",
      "name": "Growth Monthly INR",
      "billingCycle": "monthly",
      "currencyCode": "INR",
      "countryId": "country_in",
      "basePrice": 2999,
      "tariffType": "flat",
      "gstRate": 18,
      "status": "active",
      "effectiveFrom": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "tariff_growth_annual_in",
      "planId": "plan_growth_supplier",
      "name": "Growth Annual INR",
      "billingCycle": "annual",
      "currencyCode": "INR",
      "countryId": "country_in",
      "basePrice": 29999,
      "tariffType": "flat",
      "gstRate": 18,
      "status": "active",
      "effectiveFrom": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "tariff_enterprise_monthly_in",
      "planId": "plan_enterprise_supplier",
      "name": "Enterprise Monthly INR",
      "billingCycle": "monthly",
      "currencyCode": "INR",
      "countryId": "country_in",
      "basePrice": 9999,
      "tariffType": "flat",
      "gstRate": 18,
      "status": "active",
      "effectiveFrom": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "tariff_basic_merchant_monthly_in",
      "planId": "plan_basic_merchant",
      "name": "Merchant Basic Monthly INR",
      "billingCycle": "monthly",
      "currencyCode": "INR",
      "countryId": "country_in",
      "basePrice": 199,
      "tariffType": "flat",
      "gstRate": 18,
      "status": "active",
      "effectiveFrom": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "tariff_finance_merchant_monthly_in",
      "planId": "plan_finance_merchant",
      "name": "Merchant Finance Monthly INR",
      "billingCycle": "monthly",
      "currencyCode": "INR",
      "countryId": "country_in",
      "basePrice": 499,
      "tariffType": "flat",
      "gstRate": 18,
      "status": "active",
      "effectiveFrom": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "tariff_finance_merchant_annual_in",
      "planId": "plan_finance_merchant",
      "name": "Merchant Finance Annual INR",
      "billingCycle": "annual",
      "currencyCode": "INR",
      "countryId": "country_in",
      "basePrice": 4999,
      "tariffType": "flat",
      "gstRate": 18,
      "status": "active",
      "effectiveFrom": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    },
    {
      "id": "tariff_pro_merchant_monthly_in",
      "planId": "plan_pro_merchant",
      "name": "Merchant Pro Monthly INR",
      "billingCycle": "monthly",
      "currencyCode": "INR",
      "countryId": "country_in",
      "basePrice": 999,
      "tariffType": "flat",
      "gstRate": 18,
      "status": "active",
      "effectiveFrom": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    }
  ],
  "subscriptionOffers": [
    {
      "id": "offer_launch50_starter",
      "name": "India Launch 50",
      "description": "50% off the first billing period for new Indian suppliers on Starter.",
      "planId": "plan_starter_supplier",
      "discountType": "percent",
      "discountValue": 50,
      "eligibility": {
        "eligibleRoles": ["supplier"],
        "eligibleCountryIds": ["country_in"],
        "eligiblePlanIds": ["plan_starter_supplier"],
        "newSubscribersOnly": true,
        "firstSubscriptionOnly": true
      },
      "maxRedemptions": 500,
      "maxRedemptionsPerUser": 1,
      "redemptionCount": 0,
      "validFrom": "2026-08-01T00:00:00.000Z",
      "validTo": "2026-12-31T23:59:59.000Z",
      "status": "active",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    }
  ],
  "offerDiscountCodes": [
    {
      "id": "code_logiklaunch50",
      "offerId": "offer_launch50_starter",
      "code": "LOGIKLAUNCH50",
      "maxUses": 500,
      "usedCount": 0,
      "status": "active",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z",
      "createdBy": "support1"
    }
  ],
  "platformSubscriptions": [
    {
      "id": "sub_supplier1_growth",
      "subscriberId": "supplier1",
      "subscriberRole": "supplier",
      "planId": "plan_growth_supplier",
      "tariffId": "tariff_growth_monthly_in",
      "status": "active",
      "currencyCode": "INR",
      "listPrice": 2999,
      "discountAmount": 0,
      "billedAmount": 3538.82,
      "gstAmount": 539.82,
      "startedAt": "2026-08-01T00:00:00.000Z",
      "currentPeriodStart": "2026-08-01T00:00:00.000Z",
      "currentPeriodEnd": "2026-09-01T00:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z"
    }
  ],
  "hubs": [
    {
      "id": "hub_prakasam_01",
      "name": "Prakasam Central Hub",
      "countryId": "country_in",
      "stateId": "state_ap",
      "districtId": "district_prakasam",
      "country": "India",
      "state": "Andhra Pradesh",
      "district": "Prakasam",
      "villages": [
        {
          "id": "village_karavadi",
          "lgdCode": "254132",
          "name": "Karavadi",
          "pincode": "523182",
          "panchayat": "Karavadi",
          "mandal": "Ongole",
          "district": "Prakasam",
          "state": "Andhra Pradesh",
          "location": {
            "latitude": 15.5682,
            "longitude": 80.088
          },
          "population": 3800,
          "tier": "Tier 3",
          "description": "A prominent agricultural and commercial village near Ongole city."
        },
        {
          "id": "village_koppolu",
          "lgdCode": "254133",
          "name": "Koppolu",
          "pincode": "523225",
          "panchayat": "Koppolu",
          "mandal": "Ongole",
          "district": "Prakasam",
          "state": "Andhra Pradesh",
          "location": {
            "latitude": 15.518,
            "longitude": 80.024
          },
          "population": 4500,
          "tier": "Tier 3",
          "description": "Located on the western outskirts of Ongole with a growing local merchant base."
        },
        {
          "id": "village_madhavaram",
          "lgdCode": "254256",
          "name": "Madhavaram",
          "pincode": "523240",
          "panchayat": "Madhavaram",
          "mandal": "Podili",
          "district": "Prakasam",
          "state": "Andhra Pradesh",
          "location": {
            "latitude": 15.603,
            "longitude": 79.612
          },
          "population": 2900,
          "tier": "Tier 4",
          "description": "A key connecting village in Podili mandal focusing on dairy and retail."
        },
        {
          "id": "village_rayavaram",
          "lgdCode": "254312",
          "name": "Rayavaram",
          "pincode": "523316",
          "panchayat": "Rayavaram",
          "mandal": "Markapur",
          "district": "Prakasam",
          "state": "Andhra Pradesh",
          "location": {
            "latitude": 15.736,
            "longitude": 79.274
          },
          "population": 5200,
          "tier": "Tier 3",
          "description": "A larger village in Markapur mandal with active logistics routes towards the west."
        },
        {
          "id": "village_nikalampadu",
          "lgdCode": "254315",
          "name": "Nikalampadu",
          "pincode": "523316",
          "panchayat": "Nikalampadu",
          "mandal": "Markapur",
          "district": "Prakasam",
          "state": "Andhra Pradesh",
          "location": {
            "latitude": 15.702,
            "longitude": 79.312
          },
          "population": 1800,
          "tier": "Tier 4",
          "description": "A remote agrarian village near Markapur with potential for expanded supplier coverage."
        }
      ]
    }
  ],
  "routes": [
    {
      "id": "route_prakasam_01",
      "supplierId": "supplier1",
      "name": "Ongole to Markapur Logistics Route",
      "origin": "Prakasam Central Hub (Ongole)",
      "destination": "Markapur Distribution Point",
      "length": 95,
      "duration": 180,
      "villages": [
        {
          "name": "Karavadi",
          "journeyTimeFromOrigin": 15
        },
        {
          "name": "Koppolu",
          "journeyTimeFromOrigin": 35
        },
        {
          "name": "Madhavaram",
          "journeyTimeFromOrigin": 100
        },
        {
          "name": "Nikalampadu",
          "journeyTimeFromOrigin": 150
        },
        {
          "name": "Rayavaram",
          "journeyTimeFromOrigin": 170
        }
      ]
    }
  ],
  "users": [
    {
      "id": "buyer1",
      "role": "buyer",
      "status": "approved",
      "countryId": "country_in",
      "name": "Anil Kumar",
      "phone": "+919876543210",
      "email": "buyer1@logikchain.com",
      "createdAt": "2026-08-15T09:00:00.000Z",
      "address": "Door No 3-45, Karavadi Village, Ongole Mandal",
      "selectedMerchantId": "merchant1",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      },
      "villageId": "village_karavadi"
    },
    {
      "id": "buyer2",
      "role": "buyer",
      "status": "approved",
      "countryId": "country_in",
      "name": "Bala Krishna",
      "phone": "+919876543211",
      "email": "buyer2@logikchain.com",
      "createdAt": "2026-08-15T09:15:00.000Z",
      "address": "Plot 12, Koppolu Village, Ongole Mandal",
      "selectedMerchantId": "merchant1",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": false,
        "camera": true
      },
      "villageId": "village_koppolu"
    },
    {
      "id": "buyer3",
      "role": "buyer",
      "status": "approved",
      "countryId": "country_in",
      "name": "Chandra Shekar",
      "phone": "+919876543212",
      "email": "buyer3@logikchain.com",
      "createdAt": "2026-08-15T09:30:00.000Z",
      "address": "Main Road Bazar, Madhavaram Village, Podili Mandal",
      "selectedMerchantId": "merchant2",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": false
      },
      "villageId": "village_madhavaram"
    },
    {
      "id": "merchant1",
      "role": "merchant",
      "status": "approved",
      "countryId": "country_in",
      "name": "Dharma Rao",
      "phone": "+918765432100",
      "email": "merchant1@logikchain.com",
      "createdAt": "2026-08-15T08:00:00.000Z",
      "supplierId": "supplier1",
      "shopDetails": "Sri Sri Lakshmi Narasimha Kirana Stores, Karavadi",
      "gstin": "37AAALK2341M1Z1",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      },
      "villageId": "village_karavadi"
    },
    {
      "id": "merchant2",
      "role": "merchant",
      "status": "approved",
      "countryId": "country_in",
      "name": "Eshwar Reddy",
      "phone": "+918765432101",
      "email": "merchant2@logikchain.com",
      "createdAt": "2026-08-15T08:15:00.000Z",
      "supplierId": "supplier1",
      "shopDetails": "Srinivasa Grocery & Wholesale, Madhavaram",
      "gstin": "37AAALK2341M2Z3",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      },
      "villageId": "village_madhavaram"
    },
    {
      "id": "merchant3",
      "role": "merchant",
      "status": "approved",
      "countryId": "country_in",
      "name": "Ganga Raju",
      "phone": "+918765432102",
      "email": "merchant3@logikchain.com",
      "createdAt": "2026-08-15T08:30:00.000Z",
      "supplierId": "supplier2",
      "shopDetails": "Balaji General Store, Rayavaram",
      "gstin": "37AAALK2341M3Z5",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": false,
        "camera": true
      },
      "villageId": "village_rayavaram"
    },
    {
      "id": "vehicle1",
      "role": "vehicle",
      "status": "approved",
      "countryId": "country_in",
      "name": "Hari Prasad",
      "phone": "+917654321090",
      "email": "vehicle1@logikchain.com",
      "createdAt": "2026-08-15T07:00:00.000Z",
      "supplierId": "supplier1",
      "contactInfo": "+917654321090, Vehicle: AP-27-TX-1234 (Tata Ace)",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      }
    },
    {
      "id": "vehicle2",
      "role": "vehicle",
      "status": "approved",
      "countryId": "country_in",
      "name": "Imran Khan",
      "phone": "+917654321091",
      "email": "vehicle2@logikchain.com",
      "createdAt": "2026-08-15T07:15:00.000Z",
      "supplierId": "supplier1",
      "contactInfo": "+917654321091, Vehicle: AP-27-TY-5678 (Mahindra Bolero)",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      }
    },
    {
      "id": "vehicle3",
      "role": "vehicle",
      "status": "approved",
      "countryId": "country_in",
      "name": "Jaya Dev",
      "phone": "+917654321092",
      "email": "vehicle3@logikchain.com",
      "createdAt": "2026-08-15T07:30:00.000Z",
      "supplierId": "supplier2",
      "contactInfo": "+917654321092, Vehicle: AP-27-TZ-9012 (Ashok Leyland Dost)",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": false,
        "camera": false
      }
    },
    {
      "id": "supplier1",
      "role": "supplier",
      "status": "approved",
      "countryId": "country_in",
      "activeSubscriptionId": "sub_supplier1_growth",
      "name": "Kranthi Kumar",
      "phone": "+916543210980",
      "email": "supplier1@logikchain.com",
      "createdAt": "2026-08-15T06:00:00.000Z",
      "location": "Ongole Hub Headquarters, Prakasam",
      "gstin": "37AAALK2341A1Z0",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      }
    },
    {
      "id": "supplier2",
      "role": "supplier",
      "status": "approved",
      "countryId": "country_in",
      "name": "Lokesh Babu",
      "phone": "+916543210981",
      "email": "supplier2@logikchain.com",
      "createdAt": "2026-08-15T06:15:00.000Z",
      "location": "Podili Hub Office, Prakasam",
      "gstin": "37AAALK2341B1Z2",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      }
    },
    {
      "id": "supplier3",
      "role": "supplier",
      "status": "approved",
      "countryId": "country_in",
      "name": "Murali Mohan",
      "phone": "+916543210982",
      "email": "supplier3@logikchain.com",
      "createdAt": "2026-08-15T06:30:00.000Z",
      "location": "Markapur Distribution Center, Prakasam",
      "gstin": "37AAALK2341C1Z4",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      }
    },
    {
      "id": "support1",
      "role": "support",
      "status": "approved",
      "countryId": "country_in",
      "name": "Nageswara Rao",
      "phone": "+915432109870",
      "email": "support1@logikchain.com",
      "createdAt": "2026-08-15T05:00:00.000Z",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      }
    },
    {
      "id": "support2",
      "role": "support",
      "status": "approved",
      "countryId": "country_in",
      "name": "Om Prakash",
      "phone": "+915432109871",
      "email": "support2@logikchain.com",
      "createdAt": "2026-08-15T05:15:00.000Z",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      }
    },
    {
      "id": "support3",
      "role": "support",
      "status": "approved",
      "countryId": "country_in",
      "name": "Prasad Babu",
      "phone": "+915432109872",
      "email": "support3@logikchain.com",
      "createdAt": "2026-08-15T05:30:00.000Z",
      "permissions": {
        "location": true,
        "sms": true,
        "audio": true,
        "camera": true
      }
    }
  ]
}