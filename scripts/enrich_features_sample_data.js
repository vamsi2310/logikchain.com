/**
 * scripts/enrich_features_sample_data.js
 * Comprehensive sample functionality data and test specifications
 * for all 54 Logikchain features across EPIC-01 through EPIC-13.
 */

const fs = require('fs');
const path = require('path');

const FEATURE_DATA = {
  // ==========================================
  // EPIC-01: IDENTITY, AUTHENTICATION & ROLE LIFECYCLE
  // ==========================================
  "FEAT-01.01": {
    sampleData: {
      request: {
        phoneNumber: "+919876543210",
        otpCode: "492011",
        deviceId: "dev_samsung_galaxy_m34_01",
        appVersion: "1.4.2",
        fcmToken: "fcm_token_98765_prod_live"
      },
      response: {
        status: "SUCCESS",
        userId: "usr_ind_9876543210",
        role: "MERCHANT",
        customClaims: {
          role: "MERCHANT",
          status: "ACTIVE",
          orgId: "org_kirana_anantapur_01",
          officialClient: "web_pwa",
          villageId: "VIL-AP-515001-004"
        },
        idToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ1c3JfaW5k...signature",
        refreshToken: "ref_tok_8849201948201",
        expiresIn: 3600
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Phone OTP Authentication & Custom Claims Token Generation",
      endpoint: "POST /v1/auth/bootstrap",
      payload: {
        phoneNumber: "+919876543210",
        otpCode: "492011",
        deviceId: "dev_samsung_galaxy_m34_01"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.status === 'SUCCESS'",
        "res.body.customClaims.role === 'MERCHANT'",
        "res.body.idToken.length > 50",
        "res.body.expiresIn === 3600"
      ]
    }
  },

  "FEAT-01.02": {
    sampleData: {
      request: {
        legalName: "Rayalaseema Agro Producers Ltd",
        tradeName: "Rayala Farmers Mart",
        gstin: "37AAACR1234F1Z8",
        pan: "AAACR1234F",
        primaryContactPhone: "+919440112233",
        warehouseAddress: {
          addressLine: "NH-44 Bypass Road, Near APMC Yard",
          villageOrTown: "Dharmavaram",
          district: "Sri Sathya Sai",
          state: "Andhra Pradesh",
          pincode: "515671",
          latitude: 14.4142,
          longitude: 77.7214
        },
        operatingCategories: ["Grains", "Pulses", "Fresh Produce"]
      },
      response: {
        supplierId: "sup_rayalaseema_01",
        registrationNumber: "REG-AP-2026-0881",
        status: "PENDING_VERIFICATION",
        allocatedCorridorIds: ["CORR-AP-ANTP-DHARM-01"],
        createdAt: "2026-10-29T10:15:30.000Z",
        bankVerificationStatus: "SUBMITTED"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Supplier Organization Provisioning and Corridor Assignment",
      endpoint: "POST /v1/suppliers",
      payload: {
        legalName: "Rayalaseema Agro Producers Ltd",
        tradeName: "Rayala Farmers Mart",
        gstin: "37AAACR1234F1Z8",
        primaryContactPhone: "+919440112233"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.supplierId.startsWith('sup_')",
        "res.body.status === 'PENDING_VERIFICATION'",
        "Array.isArray(res.body.allocatedCorridorIds)"
      ]
    }
  },

  "FEAT-01.03": {
    sampleData: {
      request: {
        targetRole: "MERCHANT",
        businessName: "Sri Lakshmi Venkateswara Kirana",
        shopPincode: "515671",
        villageId: "VIL-AP-515671-002",
        tradeLicenseNumber: "TL-515671-2026-99"
      },
      response: {
        userId: "usr_ind_9876543210",
        previousRole: "BUYER",
        updatedRole: "MERCHANT",
        status: "APPROVED",
        claimsRefreshed: true,
        merchantWorkspaceUrl: "/workspace/merchant",
        updatedAt: "2026-10-29T11:20:00.000Z"
      }
    },
    sampleTest: {
      testType: "Playwright E2E",
      name: "Verify Progressive Role Conversion from Citizen Buyer to Merchant",
      endpoint: "POST /v1/buyers/{buyerId}/role",
      payload: {
        targetRole: "MERCHANT",
        businessName: "Sri Lakshmi Venkateswara Kirana"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.updatedRole === 'MERCHANT'",
        "res.body.claimsRefreshed === true",
        "page.locator('.merchant-dashboard-banner').isVisible()"
      ]
    }
  },

  "FEAT-01.04": {
    sampleData: {
      request: {
        action: "SUSPEND",
        reason: "Failed physical CoD cash handover reconciliation exceeding 48h limit",
        discrepancyRef: "DISC-CASH-2026-9041",
        suspendedUntil: "2026-11-15T23:59:59.000Z",
        adminAuthorizerUid: "adm_compliance_officer_04"
      },
      response: {
        userId: "usr_driver_77491",
        status: "SUSPENDED",
        reason: "Failed physical CoD cash handover reconciliation exceeding 48h limit",
        tokensRevoked: true,
        gigAssignmentBlocked: true,
        payoutsFrozen: true,
        effectiveTimestamp: "2026-10-29T14:02:11.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify User Account Suspension & Token Revocation",
      endpoint: "POST /v1/users/{userId}/suspension",
      payload: {
        action: "SUSPEND",
        reason: "Audit threshold violation",
        adminAuthorizerUid: "adm_compliance_officer_04"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.status === 'SUSPENDED'",
        "res.body.tokensRevoked === true",
        "res.body.gigAssignmentBlocked === true"
      ]
    }
  },

  "FEAT-01.05": {
    sampleData: {
      request: {
        delegatedSupportAgentId: "usr_agent_deepa_88",
        supplierId: "sup_rayalaseema_01",
        entitlementScope: ["CATALOG_READ", "INVENTORY_OVERRIDE", "DISPATCH_VIEW"],
        durationHours: 8
      },
      response: {
        ticketId: "TKT-DELEGATE-2026-551",
        status: "ACTIVE",
        expiresAt: "2026-10-29T22:30:00.000Z",
        auditTrailId: "AUD-DEL-9921",
        sessionToken: "delegated_session_token_sec_991823"
      }
    },
    sampleTest: {
      testType: "Jest Integration",
      name: "Verify Supplier-Delegated Support Gate & Entitlement Expiry",
      endpoint: "POST /v1/suppliers/{id}/delegated-access",
      payload: {
        delegatedSupportAgentId: "usr_agent_deepa_88",
        entitlementScope: ["CATALOG_READ", "DISPATCH_VIEW"]
      },
      expectedStatus: 200,
      assertions: [
        "expect(res.status).toBe(200)",
        "expect(res.body.status).toBe('ACTIVE')",
        "expect(res.body.sessionToken).toBeDefined()"
      ]
    }
  },

  "FEAT-01.06": {
    sampleData: {
      request: {
        userId: "usr_driver_77491",
        panNumber: "BKRPD1924L",
        drivingLicenseNumber: "AP0220190014523",
        kycDocuments: [
          { type: "AADHAAR_FRONT", mediaUrl: "gs://logikchain-kyc-prod/usr_driver_77491/aadhaar_f.jpg" },
          { type: "DL_FRONT", mediaUrl: "gs://logikchain-kyc-prod/usr_driver_77491/dl_f.jpg" }
        ],
        vehicleType: "THREE_WHEELER_CARGO",
        vehicleRegNo: "AP02TB4921"
      },
      response: {
        kycStatus: "SUBMITTED",
        verificationId: "KYC-DRV-2026-192",
        digilockerAadhaarMatch: true,
        panVerificationStatus: "VERIFIED",
        dlExpiryDate: "2034-08-14",
        updatedAt: "2026-10-29T16:45:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Driver KYC Upload and Automated Digilocker Verification",
      endpoint: "POST /v1/users/{userId}/kyc",
      payload: {
        userId: "usr_driver_77491",
        panNumber: "BKRPD1924L",
        drivingLicenseNumber: "AP0220190014523"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.kycStatus === 'SUBMITTED'",
        "res.body.panVerificationStatus === 'VERIFIED'",
        "res.body.digilockerAadhaarMatch === true"
      ]
    }
  },

  // ==========================================
  // EPIC-02: ORDERS & COMMERCE FULFILLMENT
  // ==========================================
  "FEAT-02.01": {
    sampleData: {
      request: {
        buyerId: "usr_ind_9876543210",
        pincode: "515671",
        villageId: "VIL-AP-515671-002",
        cartItems: [
          { skuId: "SKU-RICE-SONA-25KG", quantity: 2, unitPrice: 1350 },
          { skuId: "SKU-OIL-SUNFLOWER-1L", quantity: 5, unitPrice: 145 }
        ],
        deliveryType: "VILLAGE_PUDO_POINT",
        selectedPudoId: "PUDO-515671-KIRANA-VENKAT",
        paymentMode: "UPI_INTENT"
      },
      response: {
        orderId: "ORD-2026-1029-4401",
        status: "PLACED",
        totalAmount: 3425,
        currency: "INR",
        pudoPickupOtp: "7721",
        estimatedDeliveryTime: "2026-10-30T17:00:00.000Z",
        assignedCorridorId: "CORR-AP-ANTP-DHARM-01"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Citizen Buyer Order Placement & PUDO Pickup OTP Generation",
      endpoint: "POST /v1/orders/buyer",
      payload: {
        buyerId: "usr_ind_9876543210",
        pincode: "515671",
        cartItems: [{ skuId: "SKU-RICE-SONA-25KG", quantity: 2, unitPrice: 1350 }]
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.orderId.startsWith('ORD-')",
        "res.body.pudoPickupOtp.length === 4",
        "res.body.totalAmount > 0"
      ]
    }
  },

  "FEAT-02.02": {
    sampleData: {
      request: {
        merchantId: "mer_sri_lakshmi_515671",
        supplierId: "sup_rayalaseema_01",
        items: [
          { skuId: "SKU-SUGAR-50KG", quantity: 10, unitPrice: 1950 },
          { skuId: "SKU-ATTA-CHAKKI-30KG", quantity: 15, unitPrice: 920 }
        ],
        settlementType: "TRADE_CREDIT_T14",
        deliveryLocation: {
          villageId: "VIL-AP-515671-002",
          gpsCoordinates: { lat: 14.418, lng: 77.728 }
        }
      },
      response: {
        merchantOrderId: "MO-2026-8812",
        status: "CONFIRMED",
        subtotal: 33300,
        creditHoldApplied: 33300,
        remainingCreditLimit: 66700,
        scheduledDeliveryDate: "2026-10-31",
        dispatchGigId: "GIG-2026-5501"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify B2B Merchant Bulk Order with Trade Credit Hold",
      endpoint: "POST /v1/merchant-orders",
      payload: {
        merchantId: "mer_sri_lakshmi_515671",
        supplierId: "sup_rayalaseema_01",
        items: [{ skuId: "SKU-SUGAR-50KG", quantity: 10, unitPrice: 1950 }],
        settlementType: "TRADE_CREDIT_T14"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.merchantOrderId.startsWith('MO-')",
        "res.body.status === 'CONFIRMED'",
        "res.body.creditHoldApplied === 19500"
      ]
    }
  },

  "FEAT-02.03": {
    sampleData: {
      request: {
        orderId: "ORD-2026-1029-4401",
        driverId: "usr_driver_77491",
        hubId: "PUDO-515671-KIRANA-VENKAT",
        transitionType: "HUB_DROPOFF",
        packagesHandedOver: 2,
        hubAgentSignatureOtp: "8394"
      },
      response: {
        orderId: "ORD-2026-1029-4401",
        custodyStatus: "AT_PUDO_HUB",
        custodianId: "PUDO-515671-KIRANA-VENKAT",
        verifiedAt: "2026-10-30T14:35:10.000Z",
        buyerNotificationDispatched: true
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Package Custody Handover at PUDO Hub via Verification OTP",
      endpoint: "POST /v1/orders/{orderId}/custody/handover",
      payload: {
        orderId: "ORD-2026-1029-4401",
        driverId: "usr_driver_77491",
        hubAgentSignatureOtp: "8394"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.custodyStatus === 'AT_PUDO_HUB'",
        "res.body.buyerNotificationDispatched === true"
      ]
    }
  },

  "FEAT-02.04": {
    sampleData: {
      request: {
        orderId: "ORD-2026-1029-4401",
        returnReason: "DAMAGED_PACKAGING_LEAKAGE",
        skuId: "SKU-OIL-SUNFLOWER-1L",
        quantityReturned: 1,
        inspectionEvidenceImageUrls: [
          "gs://logikchain-returns/ORD-4401/damage_front.jpg"
        ],
        refundAction: "INSTANT_WALLET_OR_UPI"
      },
      response: {
        returnRequestId: "RET-2026-0922",
        status: "APPROVED_RTO_GENERATED",
        reverseGigId: "GIG-REV-2026-0112",
        refundCreditNoteId: "CN-2026-4401",
        refundAmount: 145.00,
        settlementStatus: "QUEUED_FOR_SETTLEMENT"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Return To Origin (RTO) Request and Automated Credit Note",
      endpoint: "POST /v1/orders/{orderId}/returns",
      payload: {
        orderId: "ORD-2026-1029-4401",
        returnReason: "DAMAGED_PACKAGING_LEAKAGE",
        skuId: "SKU-OIL-SUNFLOWER-1L",
        quantityReturned: 1
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.returnRequestId.startsWith('RET-')",
        "res.body.refundAmount === 145.00",
        "res.body.status === 'APPROVED_RTO_GENERATED'"
      ]
    }
  },

  // ==========================================
  // EPIC-03: GIG LOGISTICS, FLEET DISPATCH & ROUTING
  // ==========================================
  "FEAT-03.01": {
    sampleData: {
      request: {
        corridorId: "CORR-AP-ANTP-DHARM-01",
        driverId: "usr_driver_77491",
        vehicleRegNo: "AP02TB4921",
        departureDate: "2026-10-30",
        plannedStops: [
          { sequence: 1, villageId: "VIL-AP-515001-001", type: "WAREHOUSE_PICKUP" },
          { sequence: 2, villageId: "VIL-AP-515671-002", type: "MERCHANT_DROP" },
          { sequence: 3, villageId: "VIL-AP-515671-004", type: "PUDO_HUB_DROP" }
        ],
        totalPayloadKg: 640
      },
      response: {
        gigId: "GIG-2026-4412",
        status: "SCHEDULED",
        driverName: "K. Ramesh Kumar",
        totalStops: 3,
        estimatedDistanceKm: 68.5,
        targetFuelAllowanceInr: 450,
        baseGigPayInr: 850
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Gig Dispatch Scheduling and Driver Route Assignment",
      endpoint: "POST /v1/gigs",
      payload: {
        corridorId: "CORR-AP-ANTP-DHARM-01",
        driverId: "usr_driver_77491",
        departureDate: "2026-10-30"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.gigId.startsWith('GIG-')",
        "res.body.status === 'SCHEDULED'",
        "res.body.totalStops === 3"
      ]
    }
  },

  "FEAT-03.02": {
    sampleData: {
      request: {
        odometerStartKm: 42318.5,
        startLatitude: 14.6819,
        startLongitude: 77.6006,
        batteryPercent: 92,
        networkOperator: "JIO_4G"
      },
      response: {
        gigId: "GIG-2026-4412",
        status: "IN_TRANSIT",
        startedAt: "2026-10-30T06:15:00.000Z",
        nextWaypoint: {
          villageName: "Marur",
          expectedArrival: "2026-10-30T07:10:00.000Z",
          ordersCount: 4
        },
        telemetryFrequencySec: 30
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Start Gig Execution and Real-time Telemetry Ingress",
      endpoint: "POST /v1/gigs/GIG-2026-4412:start",
      payload: {
        odometerStartKm: 42318.5,
        startLatitude: 14.6819,
        startLongitude: 77.6006
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.status === 'IN_TRANSIT'",
        "res.body.nextWaypoint.villageName === 'Marur'"
      ]
    }
  },

  "FEAT-03.03": {
    sampleData: {
      request: {
        odometerEndKm: 42389.2,
        endLatitude: 14.4142,
        endLongitude: 77.7214,
        totalCompletedDeliveries: 18,
        totalReturnsHandled: 1,
        totalCashCollectedInr: 14200
      },
      response: {
        gigId: "GIG-2026-4412",
        status: "COMPLETED",
        totalKilometersRun: 70.7,
        driverTotalEarningsInr: 1120.00,
        settlementStatus: "PAYOUT_QUEUED",
        cashCustodyAuditId: "CSH-AUD-2026-4412"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Gig Completion Settlement and Driver Earnings Calculation",
      endpoint: "POST /v1/gigs/GIG-2026-4412:complete",
      payload: {
        odometerEndKm: 42389.2,
        totalCompletedDeliveries: 18,
        totalCashCollectedInr: 14200
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.status === 'COMPLETED'",
        "res.body.driverTotalEarningsInr > 1000",
        "res.body.cashCustodyAuditId != null"
      ]
    }
  },

  "FEAT-03.04": {
    sampleData: {
      request: {
        supplierId: "sup_rayalaseema_01",
        routeName: "Anantapur to Kadiri Morning Agro Run",
        corridorCode: "CORR-AP-ANTP-KAD-02",
        waypoints: ["Anantapur", "Bathalapalli", "Dharmavaram", "Mudigubba", "Kadiri"],
        defaultQuotaPerMonth: 30
      },
      response: {
        routeId: "RTE-CAT-2026-091",
        status: "ACTIVE",
        remainingMonthlyGigs: 28,
        quotaLimit: 30,
        clonedFrom: null,
        createdAt: "2026-10-28T09:00:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Freeform Route Authoring & Monthly Gig Quota Gate",
      endpoint: "POST /v1/routes/catalog",
      payload: {
        supplierId: "sup_rayalaseema_01",
        routeName: "Anantapur to Kadiri Morning Agro Run",
        corridorCode: "CORR-AP-ANTP-KAD-02"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.routeId.startsWith('RTE-CAT-')",
        "res.body.remainingMonthlyGigs <= res.body.quotaLimit"
      ]
    }
  },

  // ==========================================
  // EPIC-04: PAMPHLET & DYNAMIC INVENTORY DISTRIBUTION
  // ==========================================
  "FEAT-04.01": {
    sampleData: {
      request: {
        gigId: "GIG-2026-4412",
        supplierId: "sup_rayalaseema_01",
        title: "Dharmavaram Corridor Daily Pamphlet",
        items: [
          { skuId: "SKU-RICE-SONA-25KG", loadedUnits: 40, spotPrice: 1350 },
          { skuId: "SKU-OIL-SUNFLOWER-1L", loadedUnits: 120, spotPrice: 145 },
          { skuId: "SKU-TOOR-DAL-1KG", loadedUnits: 80, spotPrice: 160 }
        ]
      },
      response: {
        pamphletId: "PAM-2026-4412",
        totalSkus: 3,
        totalInventoryValue: 84200,
        inTransitStockStatus: "ACTIVE_ON_WHEELS",
        publishedAt: "2026-10-30T05:45:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Dynamic In-Transit Pamphlet Creation and Rolling Stock Initialization",
      endpoint: "POST /v1/pamphlets",
      payload: {
        gigId: "GIG-2026-4412",
        supplierId: "sup_rayalaseema_01",
        title: "Dharmavaram Corridor Daily Pamphlet"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.pamphletId.startsWith('PAM-')",
        "res.body.inTransitStockStatus === 'ACTIVE_ON_WHEELS'"
      ]
    }
  },

  "FEAT-04.02": {
    sampleData: {
      request: {
        warehouseId: "WH-ANTP-01",
        loadingSupervisorUid: "usr_sup_mahesh_09",
        manifestId: "MAN-2026-8819",
        scannedBarcodes: [
          "8901233001201",
          "8901233001202",
          "8901233001203"
        ],
        temperatureCelsius: 24.2
      },
      response: {
        pamphletId: "PAM-2026-4412",
        loadingStatus: "VERIFIED_LOADED",
        dockOutTimestamp: "2026-10-30T06:05:00.000Z",
        warehouseInventoryDeltas: [
          { skuId: "SKU-RICE-SONA-25KG", delta: -40, currentStock: 360 },
          { skuId: "SKU-OIL-SUNFLOWER-1L", delta: -120, currentStock: 880 }
        ]
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Warehouse Truck Loading & Source Stock Deductions",
      endpoint: "POST /v1/pamphlets/PAM-2026-4412/load",
      payload: {
        warehouseId: "WH-ANTP-01",
        loadingSupervisorUid: "usr_sup_mahesh_09",
        scannedBarcodes: ["8901233001201"]
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.loadingStatus === 'VERIFIED_LOADED'",
        "res.body.warehouseInventoryDeltas.length > 0"
      ]
    }
  },

  "FEAT-04.03": {
    sampleData: {
      request: {
        pamphletId: "PAM-2026-4412",
        adjustmentType: "IN_TRANSIT_DAMAGE",
        skuId: "SKU-OIL-SUNFLOWER-1L",
        damagedUnits: 2,
        incidentDescription: "Jar seal rupture on bumpy village approach road",
        photoUrl: "gs://logikchain-claims/PAM-4412/jar_leak.jpg"
      },
      response: {
        adjustmentId: "ADJ-2026-031",
        pamphletId: "PAM-2026-4412",
        approvedBySystem: true,
        revisedAvailableUnits: 118,
        supplierLossAmountInr: 290.00,
        claimStatus: "PROCESSED_CLAIM"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify In-Transit Stock Adjustment and Damage Claim Ledger Entry",
      endpoint: "POST /v1/pamphlets/PAM-2026-4412/adjust",
      payload: {
        pamphletId: "PAM-2026-4412",
        adjustmentType: "IN_TRANSIT_DAMAGE",
        skuId: "SKU-OIL-SUNFLOWER-1L",
        damagedUnits: 2
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.adjustmentId.startsWith('ADJ-')",
        "res.body.revisedAvailableUnits === 118"
      ]
    }
  },

  // ==========================================
  // EPIC-05: PAYMENTS, UPI COLLECTIONS & GATEWAY INTEGRATION
  // ==========================================
  "FEAT-05.01": {
    sampleData: {
      request: {
        orderId: "ORD-2026-1029-4401",
        amountInr: 3425.00,
        customerVpa: "ramesh@oksbi",
        merchantVpa: "logikchain.rayala@icici",
        expiryMinutes: 15
      },
      response: {
        paymentIntentId: "PI-2026-99014",
        upiIntentUrl: "upi://pay?pa=logikchain.rayala@icici&pn=Logikchain&am=3425.00&tr=ORD-2026-1029-4401&cu=INR",
        qrCodeBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        expiresAt: "2026-10-30T12:45:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Dynamic UPI QR Code Generation & Intent Deep Link",
      endpoint: "POST /v1/payments/intent",
      payload: {
        orderId: "ORD-2026-1029-4401",
        amountInr: 3425.00
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.paymentIntentId.startsWith('PI-')",
        "res.body.upiIntentUrl.startsWith('upi://pay')",
        "res.body.qrCodeBase64.length > 50"
      ]
    }
  },

  "FEAT-05.02": {
    sampleData: {
      request: {
        event: "payment.captured",
        payload: {
          payment: {
            id: "pay_RAZORPAY_8819024",
            amount: 342500,
            currency: "INR",
            status: "captured",
            order_id: "order_RAZOR_990123",
            method: "upi",
            vpa: "ramesh@oksbi",
            bank_transaction_id: "UPI-RRN-62910399120"
          }
        },
        signature: "sha256_hmac_verified_signature_99a8b"
      },
      response: {
        processed: true,
        orderId: "ORD-2026-1029-4401",
        paymentStatus: "PAID",
        rrn: "62910399120",
        settledAmount: 3425.00,
        reconciledAt: "2026-10-30T12:32:15.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify PSP Webhook Ingestion & Cryptographic Signature Validation",
      endpoint: "POST /v1/payments/webhook",
      payload: {
        event: "payment.captured",
        payload: { payment: { id: "pay_RAZORPAY_8819024", amount: 342500, status: "captured" } }
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.processed === true",
        "res.body.paymentStatus === 'PAID'",
        "res.body.rrn === '62910399120'"
      ]
    }
  },

  "FEAT-05.03": {
    sampleData: {
      request: {
        paymentId: "pay_RAZORPAY_8819024",
        refundAmount: 145.00,
        reason: "Customer return accepted for 1 unit Sunflower oil",
        referenceReturnId: "RET-2026-0922"
      },
      response: {
        refundId: "rfnd_882019482",
        status: "PROCESSED",
        arn: "ARN-SBI-9918239019",
        amountRefunded: 145.00,
        creditedToVpa: "ramesh@oksbi",
        processedAt: "2026-10-30T15:20:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Automated Reverse UPI Refund and Credit Note Dispatch",
      endpoint: "POST /v1/payments/pay_RAZORPAY_8819024/refund",
      payload: {
        paymentId: "pay_RAZORPAY_8819024",
        refundAmount: 145.00,
        reason: "Customer return accepted"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.refundId.startsWith('rfnd_')",
        "res.body.status === 'PROCESSED'",
        "res.body.amountRefunded === 145.00"
      ]
    }
  },

  // ==========================================
  // EPIC-06: PAYOUTS, DISBURSEMENTS & BENEFICIARY BANKING
  // ==========================================
  "FEAT-06.01": {
    sampleData: {
      request: {
        userId: "usr_driver_77491",
        accountHolderName: "K. Ramesh Kumar",
        bankAccountNumber: "03491010004921",
        ifscCode: "SBIN0000840",
        vpa: "rameshkumar@oksbi",
        accountType: "SAVINGS",
        consentTimestamp: "2026-10-29T10:00:00.000Z"
      },
      response: {
        beneficiaryId: "BEN-DRV-77491",
        status: "ACTIVE",
        bankName: "State Bank of India",
        branch: "Anantapur Main",
        pennyDropStatus: "VERIFIED_SUCCESS",
        accountMasked: "XXXXXX4921",
        encryptedKmsKeyVersion: "projects/logikchain/cryptoKeys/payout-dek/v2"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Beneficiary Penny-Drop Bank Verification & KMS Encryption",
      endpoint: "POST /v1/payouts/beneficiaries",
      payload: {
        userId: "usr_driver_77491",
        accountHolderName: "K. Ramesh Kumar",
        bankAccountNumber: "03491010004921",
        ifscCode: "SBIN0000840"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.beneficiaryId.startsWith('BEN-')",
        "res.body.pennyDropStatus === 'VERIFIED_SUCCESS'",
        "res.body.accountMasked.endsWith('4921')"
      ]
    }
  },

  "FEAT-06.02": {
    sampleData: {
      request: {
        requesterId: "usr_driver_77491",
        requesterRole: "DRIVER",
        payoutAmount: 2450.00,
        linkedGigIds: ["GIG-2026-4412", "GIG-2026-4398"],
        payoutMethod: "IMPS"
      },
      response: {
        payoutRequestId: "REQ-PO-2026-8812",
        status: "APPROVED_SYSTEM",
        tdsDeducted: 24.50,
        platformFeeDeducted: 0.00,
        netDisbursementAmount: 2425.50,
        scheduledExecutionTime: "2026-10-30T18:00:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Driver Daily Payout Approval & Automated TDS Withholding",
      endpoint: "POST /v1/payouts/requests",
      payload: {
        requesterId: "usr_driver_77491",
        payoutAmount: 2450.00,
        payoutMethod: "IMPS"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.payoutRequestId.startsWith('REQ-PO-')",
        "res.body.status === 'APPROVED_SYSTEM'",
        "res.body.netDisbursementAmount === 2425.50"
      ]
    }
  },

  "FEAT-06.03": {
    sampleData: {
      request: {
        payoutRequestId: "REQ-PO-2026-8812",
        cloudTasksQueue: "projects/logikchain/queues/payout-executor",
        taskRetryCount: 0
      },
      response: {
        disbursementId: "DISB-2026-99014",
        status: "SUCCESSFUL_DISBURSED",
        utrNumber: "UTR-SBIN-2026103099410",
        transferredAmount: 2425.50,
        bankGatewayResponseCode: "ACTC",
        executedAt: "2026-10-30T18:02:11.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Cloud Tasks Async Payout Execution via Banking Gateway",
      endpoint: "POST /v1/payouts/tasks/transfer",
      payload: {
        payoutRequestId: "REQ-PO-2026-8812"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.status === 'SUCCESSFUL_DISBURSED'",
        "res.body.utrNumber.startsWith('UTR-')",
        "res.body.bankGatewayResponseCode === 'ACTC'"
      ]
    }
  },

  "FEAT-06.04": {
    sampleData: {
      request: {
        supplierId: "sup_rayalaseema_01",
        billingCycle: "2026-10-B2",
        corridorId: "CORR-AP-ANTP-DHARM-01"
      },
      response: {
        totalSupplierEscrow: 489200.00,
        pendingDriverAllocations: 34100.00,
        accruedMerchantCommissions: 12500.00,
        settledPlatformFees: 9780.00,
        disputeHoldback: 5000.00,
        netPayableToSupplier: 427820.00,
        auditGovernanceStatus: "COMPLIANT"
      }
    },
    sampleTest: {
      testType: "Playwright E2E",
      name: "Verify Supplier Funds Tracking & Multi-Tier Allocation Dashboard",
      endpoint: "GET /v1/payouts/governance/summary?supplierId=sup_rayalaseema_01",
      payload: null,
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.auditGovernanceStatus === 'COMPLIANT'",
        "res.body.totalSupplierEscrow > 0",
        "expect(res.body.netPayableToSupplier).toBeGreaterThan(0)"
      ]
    }
  },

  // ==========================================
  // EPIC-07: CASH MANAGEMENT & RURAL COD CUSTODY
  // ==========================================
  "FEAT-07.01": {
    sampleData: {
      request: {
        driverId: "usr_driver_77491",
        date: "2026-10-30"
      },
      response: {
        driverId: "usr_driver_77491",
        currentFloatCustody: 14200.00,
        currency: "INR",
        maxFloatThreshold: 20000.00,
        warningThresholdExceeded: false,
        breakdownByOrder: [
          { orderId: "ORD-2026-1029-4401", cashCollected: 3425.00, time: "11:20:00" },
          { orderId: "ORD-2026-1029-4405", cashCollected: 5200.00, time: "13:45:00" },
          { orderId: "ORD-2026-1029-4410", cashCollected: 5575.00, time: "15:10:00" }
        ],
        lastHandoverStatus: "SETTLED_YESTERDAY"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Driver CoD Cash Float Accumulation & Warning Threshold",
      endpoint: "GET /v1/cash/summary/usr_driver_77491",
      payload: null,
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.currentFloatCustody === 14200.00",
        "res.body.warningThresholdExceeded === false",
        "res.body.breakdownByOrder.length === 3"
      ]
    }
  },

  "FEAT-07.02": {
    sampleData: {
      request: {
        driverId: "usr_driver_77491",
        supplierId: "sup_rayalaseema_01",
        cashDeclaredAmount: 14200.00,
        currencyDenominations: {
          note500: 28,
          note200: 0,
          note100: 2,
          coins: 0
        },
        recipientCashierUid: "usr_cashier_swathi_02",
        handoverOtp: "9041"
      },
      response: {
        handoverReceiptId: "CSH-REC-2026-8841",
        status: "CONFIRMED_DEPOSITED",
        reconciledCashAmount: 14200.00,
        driverCustodyResetTo: 0.00,
        timestamp: "2026-10-30T17:45:10.000Z",
        supplierCashierSignatureVerified: true
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Physical Cash Handover to Supplier Cashier with Two-Factor OTP",
      endpoint: "POST /v1/cash/handover/declare",
      payload: {
        driverId: "usr_driver_77491",
        cashDeclaredAmount: 14200.00,
        handoverOtp: "9041"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.handoverReceiptId.startsWith('CSH-REC-')",
        "res.body.status === 'CONFIRMED_DEPOSITED'",
        "res.body.driverCustodyResetTo === 0.00"
      ]
    }
  },

  "FEAT-07.03": {
    sampleData: {
      request: {
        driverId: "usr_driver_77491",
        supplierId: "sup_rayalaseema_01",
        expectedAmount: 14200.00,
        actualCountedAmount: 13700.00,
        shortageAmount: 500.00,
        cashierRemarks: "One counterfeit note of Rs 500 detected and confiscated",
        supportingMediaUrl: "gs://logikchain-audit/CSH-DISC-901/counterfeit_500.jpg"
      },
      response: {
        discrepancyTicketId: "DISC-CASH-2026-9041",
        status: "ESCALATED_AUDIT",
        driverDebitNoteGenerated: true,
        recoveryAction: "DEDUCT_FROM_NEXT_PAYOUT",
        investigationSlaHours: 24,
        createdAt: "2026-10-30T18:10:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Cash Discrepancy Escalation & Automated Debit Note Generation",
      endpoint: "POST /v1/cash/discrepancies",
      payload: {
        driverId: "usr_driver_77491",
        expectedAmount: 14200.00,
        actualCountedAmount: 13700.00,
        shortageAmount: 500.00
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.discrepancyTicketId.startsWith('DISC-CASH-')",
        "res.body.status === 'ESCALATED_AUDIT'",
        "res.body.driverDebitNoteGenerated === true"
      ]
    }
  },

  // ==========================================
  // EPIC-08: MERCHANT CREDIT & RISK UNDERWRITING
  // ==========================================
  "FEAT-08.01": {
    sampleData: {
      request: {
        merchantId: "mer_sri_lakshmi_515671",
        requestedCreditLimit: 100000.00,
        monthlyTurnoverAvg: 380000.00,
        gstComplianceScore: 94.5,
        cibilScore: 742,
        tenureMonthsWithLogikchain: 14
      },
      response: {
        creditAccountId: "CR-ACC-515671-01",
        approvedCreditLimit: 100000.00,
        interestFreeDays: 14,
        postDueInterestRateAnnual: 18.0,
        underwritingStatus: "APPROVED_AUTO",
        underwrittenBy: "ML_RISK_ENGINE_V3"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Automated Underwriting and Credit Line Limit Assignment",
      endpoint: "POST /v1/credit/limits",
      payload: {
        merchantId: "mer_sri_lakshmi_515671",
        requestedCreditLimit: 100000.00,
        monthlyTurnoverAvg: 380000.00
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.creditAccountId.startsWith('CR-ACC-')",
        "res.body.approvedCreditLimit === 100000.00",
        "res.body.interestFreeDays === 14"
      ]
    }
  },

  "FEAT-08.02": {
    sampleData: {
      request: {
        merchantId: "mer_sri_lakshmi_515671",
        supplierId: "sup_rayalaseema_01",
        orderId: "MO-2026-8812",
        holdAmount: 33300.00
      },
      response: {
        holdId: "HOLD-CR-2026-9912",
        status: "HELD",
        approvedAmount: 33300.00,
        availableCreditBalance: 66700.00,
        dueDueDate: "2026-11-13",
        escrowLocked: true
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Revolving Credit Pre-Authorization Hold on Order Placement",
      endpoint: "POST /v1/credit/holds",
      payload: {
        merchantId: "mer_sri_lakshmi_515671",
        orderId: "MO-2026-8812",
        holdAmount: 33300.00
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.holdId.startsWith('HOLD-CR-')",
        "res.body.status === 'HELD'",
        "res.body.availableCreditBalance === 66700.00"
      ]
    }
  },

  "FEAT-08.03": {
    sampleData: {
      request: {
        merchantId: "mer_sri_lakshmi_515671",
        holdId: "HOLD-CR-2026-9912",
        repaymentAmount: 33300.00,
        paymentSource: "UPI_AUTO_COLLECT",
        bankReferenceNumber: "UPI-COL-99210041"
      },
      response: {
        repaymentReceiptId: "REC-REP-2026-1044",
        status: "SETTLED",
        clearedHoldId: "HOLD-CR-2026-9912",
        restoredCreditLine: 100000.00,
        penaltyIncurred: 0.00,
        settledAt: "2026-11-12T14:10:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Trade Credit Repayment and Credit Line Limit Restoration",
      endpoint: "POST /v1/credit/repayments/initiate",
      payload: {
        merchantId: "mer_sri_lakshmi_515671",
        holdId: "HOLD-CR-2026-9912",
        repaymentAmount: 33300.00
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.status === 'SETTLED'",
        "res.body.restoredCreditLine === 100000.00",
        "res.body.penaltyIncurred === 0.00"
      ]
    }
  },

  "FEAT-08.04": {
    sampleData: {
      request: {
        merchantId: "mer_sri_lakshmi_515671",
        supplierId: "sup_rayalaseema_01",
        standardCycleDays: 14,
        gracePeriodDays: 3,
        moratoriumRequested: false
      },
      response: {
        policyConfigId: "POL-CR-2026-081",
        applicableCycle: "T+14_STANDARD",
        overdueToleranceDays: 3,
        autoSuspendPurchasesOnDay: 18,
        supplierRiskParticipationPercent: 20.0
      }
    },
    sampleTest: {
      testType: "Jest Integration",
      name: "Verify Trade Credit Terms & Automated Overdue Suspension Gate",
      endpoint: "GET /v1/credit/policies/mer_sri_lakshmi_515671",
      payload: null,
      expectedStatus: 200,
      assertions: [
        "expect(res.status).toBe(200)",
        "expect(res.body.applicableCycle).toBe('T+14_STANDARD')",
        "expect(res.body.autoSuspendPurchasesOnDay).toBe(18)"
      ]
    }
  },

  // ==========================================
  // EPIC-09: FINANCIAL LEDGER, RECONCILIATION & TAX ACCOUNTING
  // ==========================================
  "FEAT-09.01": {
    sampleData: {
      request: {
        journalDate: "2026-10-30",
        referenceId: "ORD-2026-1029-4401",
        narration: "B2C Order Online UPI Collection & Platform Fee split",
        entries: [
          { accountCode: "1010_CASH_ESCROW_UPI", type: "DEBIT", amount: 3425.00 },
          { accountCode: "2010_SUPPLIER_PAYABLE", type: "CREDIT", amount: 3253.75 },
          { accountCode: "3010_PLATFORM_REVENUE", type: "CREDIT", amount: 145.13 },
          { accountCode: "2050_OUTPUT_GST_PAYABLE", type: "CREDIT", amount: 26.12 }
        ]
      },
      response: {
        journalEntryId: "JE-2026-1030-9901",
        status: "POSTED",
        isBalanced: true,
        totalDebits: 3425.00,
        totalCredits: 3425.00,
        ledgerHash: "sha256_b39d10f8a9204899120de840...",
        immutableSequenceNumber: 449210
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Double-Entry Balanced Journal Post & Cryptographic Ledger Hash",
      endpoint: "POST /v1/finance/journal-entries",
      payload: {
        journalDate: "2026-10-30",
        referenceId: "ORD-2026-1029-4401",
        entries: [
          { accountCode: "1010_CASH_ESCROW_UPI", type: "DEBIT", amount: 3425.00 },
          { accountCode: "2010_SUPPLIER_PAYABLE", type: "CREDIT", amount: 3425.00 }
        ]
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.journalEntryId.startsWith('JE-')",
        "res.body.isBalanced === true",
        "res.body.totalDebits === res.body.totalCredits"
      ]
    }
  },

  "FEAT-09.02": {
    sampleData: {
      request: {
        reconciliationDate: "2026-10-29",
        partnerGateway: "ICICI_UPI_STACK",
        bankStatementCsvUrl: "gs://logikchain-reconcile-inbound/bank_stmt_20261029.csv"
      },
      response: {
        jobId: "RECON-JOB-2026-1029-01",
        status: "COMPLETED_RECONCILED",
        totalBankRecords: 4892,
        matchedRecords: 4890,
        unmatchedDiscrepancies: 2,
        discrepancyTicketIds: ["DISC-RECON-1029-01", "DISC-RECON-1029-02"],
        reconciliationScorePercent: 99.96
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Automated Daily Bank Settlement Reconciliation Job",
      endpoint: "POST /v1/finance/reconciliation:run",
      payload: {
        reconciliationDate: "2026-10-29",
        partnerGateway: "ICICI_UPI_STACK"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.status === 'COMPLETED_RECONCILED'",
        "res.body.reconciliationScorePercent >= 99.5"
      ]
    }
  },

  "FEAT-09.03": {
    sampleData: {
      request: {
        financialQuarter: "2026-Q3",
        taxSection: "194O_ECOMMERCE_TDS",
        sectionTdsRatePercent: 1.0,
        supplierTdsRegister: [
          { supplierId: "sup_rayalaseema_01", pan: "AAACR1234F", grossTurnover: 4892000.00, tdsDeducted: 48920.00 }
        ]
      },
      response: {
        challanId: "CHALLAN-IT-2026-Q3-194O-01",
        status: "GENERATED_FOR_NSDL",
        totalTdsPayableInr: 48920.00,
        portalFilingReference: "NSDL-ACK-9940129",
        form26QJsonUrl: "gs://logikchain-tax-exports/form26q_2026_q3.json"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Statutory TDS Section 194O Calculation and Challan Packaging",
      endpoint: "POST /v1/finance/tds/challans",
      payload: {
        financialQuarter: "2026-Q3",
        taxSection: "194O_ECOMMERCE_TDS"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.challanId.startsWith('CHALLAN-')",
        "res.body.status === 'GENERATED_FOR_NSDL'",
        "res.body.totalTdsPayableInr > 0"
      ]
    }
  },

  // ==========================================
  // EPIC-10: MASTER CONFIGURATION, GEO-HIERARCHY & SUBSCRIPTIONS
  // ==========================================
  "FEAT-10.01": {
    sampleData: {
      request: {
        villageName: "Kambadur",
        villageCode: "VIL-AP-515765-001",
        pincode: "515765",
        mandal: "Kambadur",
        district: "Anantapur",
        state: "Andhra Pradesh",
        latitude: 14.3482,
        longitude: 77.2349,
        googlePlaceId: "ChIJb_81k2mRrzsRv5-sample"
      },
      response: {
        villageId: "VIL-AP-515765-001",
        status: "GEOCODED_VERIFIED",
        assignedCorridor: "CORR-AP-ANTP-KALYAN-01",
        isServiceable: true,
        nearestWarehouseId: "WH-ANTP-01",
        distanceToHubKm: 42.1
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Village Geocoding Hierarchy and Automatic Corridor Attachment",
      endpoint: "POST /v1/config/villages",
      payload: {
        villageName: "Kambadur",
        pincode: "515765",
        mandal: "Kambadur",
        district: "Anantapur",
        state: "Andhra Pradesh"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.villageId === 'VIL-AP-515765-001'",
        "res.body.status === 'GEOCODED_VERIFIED'",
        "res.body.isServiceable === true"
      ]
    }
  },

  "FEAT-10.02": {
    sampleData: {
      request: {
        tierType: "SUPPLIER_TIER",
        region: "AP_RAYALASEEMA"
      },
      response: {
        plans: [
          {
            planId: "PLAN-SUP-BASIC",
            name: "Supplier Starter",
            monthlyPriceInr: 1999,
            monthlyGigQuota: 15,
            additionalGigTariffInr: 120,
            pamphletSkusLimit: 50
          },
          {
            planId: "PLAN-SUP-PRO",
            name: "Regional Agribusiness Growth",
            monthlyPriceInr: 4999,
            monthlyGigQuota: 45,
            additionalGigTariffInr: 90,
            pamphletSkusLimit: 250
          }
        ]
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Subscription Tariff Fetch & Quota Tier Rules",
      endpoint: "GET /v1/config/plans?tierType=SUPPLIER_TIER",
      payload: null,
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "Array.isArray(res.body.plans)",
        "res.body.plans[0].planId === 'PLAN-SUP-BASIC'",
        "res.body.plans[1].monthlyGigQuota === 45"
      ]
    }
  },

  "FEAT-10.03": {
    sampleData: {
      request: {
        jurisdictionState: "Andhra Pradesh",
        stateCodeGst: "37",
        hsnProfiles: [
          { hsnCode: "1006", category: "Paddy / Rice", cgstRate: 0.0, sgstRate: 0.0, igstRate: 0.0 },
          { hsnCode: "1512", category: "Edible Sunflower Oil", cgstRate: 2.5, sgstRate: 2.5, igstRate: 5.0 },
          { hsnCode: "9968", category: "Courier & Rural Delivery Services", cgstRate: 9.0, sgstRate: 9.0, igstRate: 18.0 }
        ]
      },
      response: {
        profileId: "TAX-PROF-AP-2026",
        status: "ACTIVE",
        appliedFrom: "2026-04-01",
        hsnRulesCount: 3,
        reverseChargeExempt: false
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Master GST & HSN Tax Profile Configuration",
      endpoint: "POST /v1/config/tax-profiles",
      payload: {
        jurisdictionState: "Andhra Pradesh",
        stateCodeGst: "37"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.profileId.startsWith('TAX-PROF-')",
        "res.body.status === 'ACTIVE'",
        "res.body.hsnRulesCount === 3"
      ]
    }
  },

  "FEAT-10.04": {
    sampleData: {
      request: {
        actingSupportAgentUid: "usr_agent_deepa_88",
        targetSupplierId: "sup_rayalaseema_01",
        actionType: "UPDATE_INVENTORY_RESTRICTION",
        parameters: { maxDailyWeightKg: 1200 }
      },
      response: {
        proxyAuditId: "AUD-PROXY-2026-1049",
        status: "EXECUTED_SUCCESS",
        authorizerUid: "usr_agent_deepa_88",
        effectiveForSupplier: "sup_rayalaseema_01",
        impersonationLogged: true,
        executedAt: "2026-10-30T10:14:00.000Z"
      }
    },
    sampleTest: {
      testType: "Jest Integration",
      name: "Verify Support-as-Supplier Proxy Authorization and Security Audit",
      endpoint: "POST /v1/config/support/proxy-action",
      payload: {
        actingSupportAgentUid: "usr_agent_deepa_88",
        targetSupplierId: "sup_rayalaseema_01"
      },
      expectedStatus: 200,
      assertions: [
        "expect(res.status).toBe(200)",
        "expect(res.body.impersonationLogged).toBe(true)",
        "expect(res.body.status).toBe('EXECUTED_SUCCESS')"
      ]
    }
  },

  "FEAT-10.05": {
    sampleData: {
      request: {
        district: "Sri Sathya Sai",
        state: "Andhra Pradesh",
        csvBatchUrl: "gs://logikchain-geo-ingest/sss_villages_batch_04.csv",
        totalRows: 124,
        conflictResolution: "SUPERIMPOSE_EXISTING"
      },
      response: {
        importJobId: "GEO-IMP-2026-081",
        status: "PROCESSED",
        villagesAdded: 118,
        villagesUpdated: 6,
        corridorsAutoGenerated: 3,
        validationErrorsCount: 0
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Bulk Geo-Data Ingestion and Superimposition Over Existing Corridors",
      endpoint: "POST /v1/config/geo/bulk-import",
      payload: {
        district: "Sri Sathya Sai",
        state: "Andhra Pradesh",
        conflictResolution: "SUPERIMPOSE_EXISTING"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.status === 'PROCESSED'",
        "res.body.validationErrorsCount === 0",
        "res.body.villagesAdded > 100"
      ]
    }
  },

  "FEAT-10.06": {
    sampleData: {
      request: {
        supplierId: "sup_rayalaseema_01",
        pudoHubId: "PUDO-515671-KIRANA-VENKAT",
        villageId: "VIL-AP-515671-002",
        commissionType: "TIERED_PER_PARCEL",
        baseFeePerParcelInr: 15.0,
        volumeIncentiveThreshold: 200,
        volumeIncentiveFeeInr: 20.0
      },
      response: {
        ruleId: "COMM-RULE-PUDO-515671",
        status: "ACTIVE",
        pudoCommissionAccount: "ACC-PUDO-VENKAT-01",
        effectiveStartDate: "2026-11-01",
        authorizedBySupplier: true
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Merchant PUDO Hub Commission Tier Creation & Payout Threshold",
      endpoint: "POST /v1/config/pudo/commissions",
      payload: {
        pudoHubId: "PUDO-515671-KIRANA-VENKAT",
        baseFeePerParcelInr: 15.0
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.ruleId.startsWith('COMM-RULE-')",
        "res.body.status === 'ACTIVE'",
        "res.body.authorizedBySupplier === true"
      ]
    }
  },

  "FEAT-10.07": {
    sampleData: {
      request: {
        corridorId: "CORR-AP-ANTP-DHARM-01",
        action: "DEACTIVATE_AND_SAFE_DELETE",
        migrationTargetCorridorId: "CORR-AP-ANTP-DHARM-EXP-02",
        authorizingAdmin: "adm_infra_lead_01"
      },
      response: {
        corridorId: "CORR-AP-ANTP-DHARM-01",
        deletionStatus: "SOFT_DELETED_ARCHIVED",
        activeGigsMigrated: 2,
        orphanedVillagesReassigned: 8,
        archivedTimestamp: "2026-10-30T11:45:00.000Z"
      }
    },
    sampleTest: {
      testType: "Jest Integration",
      name: "Verify Master Route Corridor Deletion & Active Gig Migration Policy",
      endpoint: "POST /v1/config/corridors/{id}/safe-delete",
      payload: {
        action: "DEACTIVATE_AND_SAFE_DELETE",
        migrationTargetCorridorId: "CORR-AP-ANTP-DHARM-EXP-02"
      },
      expectedStatus: 200,
      assertions: [
        "expect(res.status).toBe(200)",
        "expect(res.body.deletionStatus).toBe('SOFT_DELETED_ARCHIVED')",
        "expect(res.body.orphanedVillagesReassigned).toBe(8)"
      ]
    }
  },

  "FEAT-10.08": {
    sampleData: {
      request: {
        supplierId: "sup_rayalaseema_01",
        entityTypes: ["WAREHOUSES", "ROUTES", "SKUS", "PRICING_TABLES"],
        sourceFormat: "JSON_PACKAGE",
        dataPackageUrl: "gs://logikchain-bulk/rayala_seed_package_v1.json"
      },
      response: {
        loaderJobId: "BULK-SEED-2026-092",
        status: "SUCCESSFULLY_LOADED",
        warehousesCreated: 2,
        routesConfigured: 4,
        skusImported: 180,
        pricingRulesInitialized: 180,
        completedInSeconds: 3.4
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Support Bulk Ingestion and Selective Entity Loader for Supplier Ecosystem",
      endpoint: "POST /v1/config/suppliers/bulk-seed",
      payload: {
        supplierId: "sup_rayalaseema_01",
        entityTypes: ["WAREHOUSES", "ROUTES", "SKUS"]
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.status === 'SUCCESSFULLY_LOADED'",
        "res.body.skusImported > 0",
        "res.body.routesConfigured > 0"
      ]
    }
  },

  // ==========================================
  // EPIC-11: PLATFORM GOVERNANCE, COMPLIANCE & AML
  // ==========================================
  "FEAT-11.01": {
    sampleData: {
      request: {
        supplierId: "sup_rayalaseema_01",
        requestedVpa: "logikchain.rayala@icici",
        pspHandle: "icici",
        beneficiaryBankAccount: "03491010004921",
        ifscCode: "ICIC0000349"
      },
      response: {
        vpaRegistrationId: "VPA-REG-2026-0129",
        vpa: "logikchain.rayala@icici",
        npciStatus: "ACTIVE_REGISTERED",
        tpapBinding: "LOGIKCHAIN_ICICI_TPAP",
        registeredTimestamp: "2026-10-28T12:00:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify NPCI UPI TPAP VPA Registration & Banking Handle Binding",
      endpoint: "POST /v1/governance/vpa/register",
      payload: {
        supplierId: "sup_rayalaseema_01",
        requestedVpa: "logikchain.rayala@icici",
        pspHandle: "icici"
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.vpaRegistrationId.startsWith('VPA-REG-')",
        "res.body.npciStatus === 'ACTIVE_REGISTERED'",
        "res.body.tpapBinding === 'LOGIKCHAIN_ICICI_TPAP'"
      ]
    }
  },

  "FEAT-11.02": {
    sampleData: {
      request: {
        userId: "usr_ind_9876543210",
        transactionAmount: 48500.00,
        paymentMethod: "UPI",
        deviceFingerprint: "fp_chrome_android_8820",
        dailyCumulativeTotal: 96000.00
      },
      response: {
        amlCheckId: "AML-CHK-2026-99014",
        verdict: "PASS_WITH_MONITORING",
        velocityScore: 32,
        riskScore: 18,
        flaggedForManualReview: false,
        sanctionsListMatch: false,
        evaluatedAt: "2026-10-30T12:30:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Real-Time AML Velocity Evaluation and Risk Score Calculation",
      endpoint: "POST /v1/governance/aml/check",
      payload: {
        userId: "usr_ind_9876543210",
        transactionAmount: 48500.00,
        paymentMethod: "UPI"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.verdict === 'PASS_WITH_MONITORING'",
        "res.body.sanctionsListMatch === false",
        "res.body.riskScore < 50"
      ]
    }
  },

  "FEAT-11.03": {
    sampleData: {
      request: {
        disputeType: "NON_DELIVERY_AFTER_PAYMENT",
        orderId: "ORD-2026-1029-4401",
        complainantUid: "usr_ind_9876543210",
        disputedAmount: 3425.00,
        description: "Driver marked as delivered at PUDO but PUDO hub owner was closed for Diwali festival"
      },
      response: {
        disputeTicketId: "DISP-2026-0812",
        status: "INVESTIGATION_IN_PROGRESS",
        slaDeadline: "2026-11-01T12:00:00.000Z",
        assignedOmbudsman: "usr_agent_raghav_03",
        escrowFreezeApplied: true
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Customer Dispute Creation, SLA Timer & Escrow Freeze",
      endpoint: "POST /v1/governance/disputes",
      payload: {
        disputeType: "NON_DELIVERY_AFTER_PAYMENT",
        orderId: "ORD-2026-1029-4401",
        disputedAmount: 3425.00
      },
      expectedStatus: 201,
      assertions: [
        "res.status === 201",
        "res.body.disputeTicketId.startsWith('DISP-')",
        "res.body.status === 'INVESTIGATION_IN_PROGRESS'",
        "res.body.escrowFreezeApplied === true"
      ]
    }
  },

  "FEAT-11.04": {
    sampleData: {
      request: {
        userId: "usr_ind_9876543210",
        policyVersion: "2026.4_RURAL_DATA_CONSENT",
        consentItems: [
          { item: "TERMS_OF_SERVICE", agreed: true },
          { item: "PRIVACY_POLICY", agreed: true },
          { item: "DIGITAL_COMMERCE_CONSENT", agreed: true }
        ],
        ipAddress: "49.206.18.42",
        userAgent: "Logikchain PWA Chrome/129.0"
      },
      response: {
        consentRecordId: "CONS-2026-99120",
        status: "LOGGED_IMMUTABLE",
        timestamp: "2026-10-30T09:15:22.000Z",
        sha256Proof: "a1c90f848...immutable_signature"
      }
    },
    sampleTest: {
      testType: "Jest Integration",
      name: "Verify Versioned Terms of Service Consent Recording and Audit Signature",
      endpoint: "POST /v1/governance/consent",
      payload: {
        userId: "usr_ind_9876543210",
        policyVersion: "2026.4_RURAL_DATA_CONSENT"
      },
      expectedStatus: 200,
      assertions: [
        "expect(res.status).toBe(200)",
        "expect(res.body.status).toBe('LOGGED_IMMUTABLE')",
        "expect(res.body.sha256Proof).toBeDefined()"
      ]
    }
  },

  // ==========================================
  // EPIC-12: API GATEWAY & BIDIRECTIONAL DATA SYNC INFRASTRUCTURE
  // ==========================================
  "FEAT-12.01": {
    sampleData: {
      request: {
        method: "GET",
        path: "/v1/pamphlets/active",
        headers: {
          "Authorization": "Bearer eyJhbGciOiJSUzI1NiIs...",
          "X-Logikchain-Client": "web_pwa",
          "X-Village-Context": "VIL-AP-515671-002"
        }
      },
      response: {
        routedMicroservice: "pamphlet-service:4004",
        gatewayLatencyMs: 4,
        upstreamStatusCode: 200,
        rateLimitRemaining: 982,
        rateLimitResetSec: 58
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Unified API Gateway Ingress Routing & Auth Context Headers Injection",
      endpoint: "GET /v1/pamphlets/active",
      payload: null,
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.headers['x-gateway-latency'] != null",
        "res.body != null"
      ]
    }
  },

  "FEAT-12.02": {
    sampleData: {
      request: {
        appCheckToken: "eyJraWQiOiJmY21fYXBwX2NoZWNrIi...",
        callingOrigin: "https://logikchain.com",
        devicePlatform: "Android-Chrome-PWA"
      },
      response: {
        attestationStatus: "VERIFIED_GENUINE",
        issuer: "firebase-app-check",
        tokenValidUntil: "2026-10-30T14:00:00.000Z",
        zeroTrustPolicyAction: "ALLOW_INGRESS"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Firebase App Check Zero-Trust Perimeter Attestation Middleware",
      endpoint: "POST /v1/gateway/attest-token",
      payload: {
        appCheckToken: "eyJraWQiOiJmY21fYXBwX2NoZWNrIi..."
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.attestationStatus === 'VERIFIED_GENUINE'",
        "res.body.zeroTrustPolicyAction === 'ALLOW_INGRESS'"
      ]
    }
  },

  "FEAT-12.03": {
    sampleData: {
      request: {
        sourceDb: "orders_db",
        sourceTable: "customer_orders",
        targetFirestoreCollection: "Orders",
        batchLimit: 50
      },
      response: {
        syncEngineStatus: "HEALTHY_STREAMING",
        lastSyncTimestamp: "2026-10-30T12:59:58.000Z",
        lagMilliseconds: 142,
        mutationsReplicated: 48,
        cdcCursorPosition: "WAL_000000010000004A00000012"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Bidirectional Microservice Postgres to Cloud Firestore CDC Engine",
      endpoint: "GET /sync/status?sourceDb=orders_db",
      payload: null,
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.syncEngineStatus === 'HEALTHY_STREAMING'",
        "res.body.lagMilliseconds < 500"
      ]
    }
  },

  "FEAT-12.04": {
    sampleData: {
      request: {
        mediaContentType: "image/jpeg",
        fileSizeBytes: 245100,
        intendedBucketFolder: "pudo_proof_of_delivery",
        userUid: "usr_driver_77491"
      },
      response: {
        uploadTicketId: "TKT-UP-2026-0941",
        signedUploadUrl: "https://storage.googleapis.com/logikchain-public-media/pudo_proof/upload_temp_key_9941?Expires=1761829000...",
        destinationGcsUri: "gs://logikchain-public-media/pudo_proof/pod_usr_driver_77491_20261030.jpg",
        cdnPublicUrl: "https://cdn.logikchain.com/pudo_proof/pod_usr_driver_77491_20261030.jpg",
        expiresInSeconds: 900
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Firebase Cloud Storage Signed Upload Ticket Issuance",
      endpoint: "POST /v1/storage/upload-ticket",
      payload: {
        mediaContentType: "image/jpeg",
        fileSizeBytes: 245100
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.uploadTicketId.startsWith('TKT-UP-')",
        "res.body.signedUploadUrl.includes('storage.googleapis.com')",
        "res.body.expiresInSeconds === 900"
      ]
    }
  },

  // ==========================================
  // EPIC-13: SOCIAL MEDIA CONNECT & USER INTERACTION ORCHESTRATOR
  // ==========================================
  "FEAT-13.01": {
    sampleData: {
      request: {
        userId: "usr_ind_9876543210",
        channels: {
          whatsapp: true,
          sms: true,
          push: true
        },
        preferredLanguage: "te-IN",
        quietHours: { enabled: true, start: "22:00", end: "06:00" }
      },
      response: {
        userId: "usr_ind_9876543210",
        syncedToFirestore: true,
        firestorePath: "UserPreferences/usr_ind_9876543210",
        activeChannels: ["WHATSAPP", "SMS", "PUSH"],
        preferredLanguage: "te-IN",
        updatedAt: "2026-10-30T08:20:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify User Notification Channel Preferences & Multi-lingual Profile Sync",
      endpoint: "GET /api/v1/preferences/usr_ind_9876543210",
      payload: null,
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.syncedToFirestore === true",
        "res.body.preferredLanguage === 'te-IN'",
        "Array.isArray(res.body.activeChannels)"
      ]
    }
  },

  "FEAT-13.02": {
    sampleData: {
      request: {
        destinationPhone: "+919876543210",
        purpose: "LOGIN_VERIFICATION",
        templateName: "otp_verification_telugu",
        language: "te"
      },
      response: {
        interactionId: "INT-WA-2026-90412",
        status: "DELIVERED",
        provider: "META_WHATSAPP_BUSINESS_API",
        messageId: "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSMzAy...",
        fallbackSmsQueued: false,
        sentAt: "2026-10-30T10:00:01.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify WhatsApp Business Cloud API OTP Dispatch & Delivery Receipt",
      endpoint: "POST /api/v1/interaction/otp",
      payload: {
        destinationPhone: "+919876543210",
        purpose: "LOGIN_VERIFICATION"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.interactionId.startsWith('INT-WA-')",
        "res.body.status === 'DELIVERED'",
        "res.body.provider === 'META_WHATSAPP_BUSINESS_API'"
      ]
    }
  },

  "FEAT-13.03": {
    sampleData: {
      request: {
        orderId: "ORD-2026-1029-4401",
        eventType: "ORDER_ARRIVED_AT_PUDO",
        customerPhone: "+919876543210",
        pudoLocationName: "Sri Lakshmi Kirana, Dharmavaram",
        pickupOtp: "7721",
        pudoOpenUntil: "21:00"
      },
      response: {
        alertId: "ALT-2026-1029-4401",
        dispatchedChannels: ["WHATSAPP", "SMS"],
        whatsappMessageId: "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSMzAy_STATUS_01",
        smsGatewayRrn: "SMS-RRN-99210",
        deliveryStatus: "SENT"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Real-Time Order Lifecycle Event Alert to WhatsApp & SMS Gateways",
      endpoint: "POST /api/v1/interaction/order-update",
      payload: {
        orderId: "ORD-2026-1029-4401",
        eventType: "ORDER_ARRIVED_AT_PUDO",
        pickupOtp: "7721"
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.alertId.startsWith('ALT-')",
        "res.body.dispatchedChannels.includes('WHATSAPP')",
        "res.body.deliveryStatus === 'SENT'"
      ]
    }
  },

  "FEAT-13.04": {
    sampleData: {
      request: {
        orderId: "MO-2026-8812",
        recipientType: "MERCHANT",
        merchantGstin: "37AAACR1234F1Z8",
        invoiceNumber: "INV-2026-1030-0082",
        invoicePdfGcsUri: "gs://logikchain-invoices/INV-2026-1030-0082.pdf",
        totalInvoiceAmount: 33300.00,
        cgstAmount: 1498.50,
        sgstAmount: 1498.50
      },
      response: {
        billDispatchId: "BILL-DISP-2026-081",
        status: "DELIVERED_TO_WHATSAPP",
        recipientPhone: "+919440112233",
        pdfDownloadUrl: "https://bills.logikchain.com/view?token=tok_inv_8812_secure",
        taxComplianceLogged: true,
        dispatchedAt: "2026-10-30T16:10:00.000Z"
      }
    },
    sampleTest: {
      testType: "Bruno API",
      name: "Verify Automated GST Digital Bill Delivery via WhatsApp Media Message",
      endpoint: "POST /api/v1/interaction/bill",
      payload: {
        orderId: "MO-2026-8812",
        invoiceNumber: "INV-2026-1030-0082",
        totalInvoiceAmount: 33300.00
      },
      expectedStatus: 200,
      assertions: [
        "res.status === 200",
        "res.body.billDispatchId.startsWith('BILL-DISP-')",
        "res.body.status === 'DELIVERED_TO_WHATSAPP'",
        "res.body.taxComplianceLogged === true"
      ]
    }
  }
};

// Execution logic
function run() {
  console.log('Loading datasets...');
  const webDataPath = path.resolve(__dirname, '../web/src/data/work_management_data.json');
  const wmJsonPath = path.resolve(__dirname, '../work-management/work_management_data.json');
  const wmJsPath = path.resolve(__dirname, '../work-management/work_management_data.js');

  const webData = JSON.parse(fs.readFileSync(webDataPath, 'utf8'));
  const wmJson = JSON.parse(fs.readFileSync(wmJsonPath, 'utf8'));

  let enrichedCount = 0;
  let missingCount = 0;

  function enrichDataset(dataset) {
    dataset.forEach(epic => {
      if (epic.features) {
        epic.features.forEach(feat => {
          const enrichment = FEATURE_DATA[feat.id];
          if (enrichment) {
            feat.sampleData = enrichment.sampleData;
            feat.sampleTest = enrichment.sampleTest;
            enrichedCount++;
          } else {
            console.warn(`WARNING: Missing sample data for feature ${feat.id}: ${feat.title}`);
            missingCount++;
          }
        });
      }
    });
  }

  enrichDataset(webData);
  console.log(`Enriched web data: ${enrichedCount} features (missing: ${missingCount})`);

  // Enrich work-management json as well
  let wmEnriched = 0;
  wmJson.forEach(epic => {
    if (epic.features) {
      epic.features.forEach(feat => {
        const enrichment = FEATURE_DATA[feat.id];
        if (enrichment) {
          feat.sampleData = enrichment.sampleData;
          feat.sampleTest = enrichment.sampleTest;
          wmEnriched++;
        }
      });
    }
  });

  // Write updated JSON files
  fs.writeFileSync(webDataPath, JSON.stringify(webData, null, 2), 'utf8');
  console.log(`Saved enriched web data to ${webDataPath}`);

  fs.writeFileSync(wmJsonPath, JSON.stringify(wmJson, null, 2), 'utf8');
  console.log(`Saved enriched work-management data to ${wmJsonPath}`);

  // Update work-management/work_management_data.js while preserving store wrapper
  const existingJs = fs.readFileSync(wmJsPath, 'utf8');
  const headerEndIndex = existingJs.indexOf('const BASELINE_DATA = [');
  const storeStartIndex = existingJs.indexOf('class WorkManagementStore {');

  if (headerEndIndex !== -1 && storeStartIndex !== -1) {
    const header = existingJs.slice(0, headerEndIndex);
    const storeCode = existingJs.slice(storeStartIndex);
    const newJs = `${header}const BASELINE_DATA = ${JSON.stringify(wmJson, null, 2)};\n\n  ${storeCode}`;
    fs.writeFileSync(wmJsPath, newJs, 'utf8');
    console.log(`Successfully updated ${wmJsPath}`);
  } else {
    console.warn('Could not determine exact insertion points for work_management_data.js');
  }

  console.log(`Finished! Total features enriched: ${Object.keys(FEATURE_DATA).length}`);
}

run();

