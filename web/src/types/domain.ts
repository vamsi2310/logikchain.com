/** Domain types used by the PWA. Shapes follow constitution/Logikchain_Data_Structures.md. */

export type UserRole = "buyer" | "merchant" | "vehicle" | "supplier" | "support";
export type UserStatus = "approved" | "unauthorized" | "suspended";
export type ConfigRecordStatus = "active" | "inactive";
export type PaymentMode = "online" | "cash_on_pickup";
export type MerchantOrderPaymentMode = "credit" | "online" | "cash_on_delivery";
export type NotificationCategory =
  | "gig_arrival"
  | "gig_assignment"
  | "gig_suspension"
  | "order_status"
  | "credit"
  | "payout"
  | "subscription"
  | "support"
  | "cash_custody"
  | "verification"
  | "privacy"
  | "payment"
  | "refund"
  | "money_exception"
  | "reconciliation";

export interface UserProfile {
  id: string;
  role: UserRole;
  status: UserStatus;
  name?: string;
  phone?: string;
  email?: string;
  createdAt?: string;
  address?: string;
  countryId?: string;
  selectedMerchantId?: string;
  permissions?: {
    location: boolean;
    sms: boolean;
    audio: boolean;
    camera: boolean;
  };
  villageId?: string;
  supplierId?: string;
  shopDetails?: string;
  contactInfo?: string;
  location?: string;
  gstin?: string;
  panNumber?: string;
  activeSubscriptionId?: string;
  activeBeneficiaryId?: string;
  payoutMethod?: {
    type: "upi" | "bank";
    maskedLabel: string;
    verificationStatus: string;
  };
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleCapacityKg?: number;
  locale?: string;
  notificationPrefs?: {
    mutedCategories: NotificationCategory[];
    sound: boolean;
  };
  driverPay?: {
    baseTripAmount: number;
    perKm: number;
    perDelivery: number;
  };
  suspension?: {
    scope: string;
    reasonCode: string;
    reason: string;
    restorePath: string;
    suspendedAt: string;
    settlementOutstanding?: boolean;
  };
}

export interface Country {
  id: string;
  name: string;
  isoCode: string;
  mobilePrefix: string;
  phoneNumberLength: number;
  phoneValidationRegex?: string;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  status: ConfigRecordStatus;
  supportPhone?: string;
  supportHours?: string;
}

export interface State {
  id: string;
  countryId: string;
  name: string;
  code: string;
  status: ConfigRecordStatus;
}

export interface District {
  id: string;
  countryId: string;
  stateId: string;
  name: string;
  status: ConfigRecordStatus;
}

export interface Hub {
  id: string;
  name: string;
  countryId: string;
  stateId: string;
  districtId: string;
  country: string;
  state: string;
  district: string;
}

export interface VillageRequest {
  id: string;
  requestedBy: string;
  requesterRole?: string;
  name: string;
  pincode?: string;
  district: string;
  state: string;
  status: "pending_support_review" | "approved" | "rejected";
  createdAt?: string;
}

export interface Village {
  id: string;
  lgdCode?: string;
  name: string;
  pincode?: string;
  panchayat?: string;
  mandal?: string;
  district?: string;
  state?: string;
  hubId?: string;
  countryId?: string;
  stateId?: string;
  districtId?: string;
  status?: ConfigRecordStatus;
  location?: { latitude: number; longitude: number };
}

export interface Product {
  id: string;
  supplierId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  hsnCode: string;
  imageUrl?: string;
  lowStockAlert?: number;
}

export interface Pamphlet {
  id: string;
  supplierId: string;
  title: string;
  subtitle: string;
  promotedProducts: Array<{
    productId: string;
    name: string;
    originalPrice: number;
    discountedPrice: number;
    currentStock: number;
    totalStock: number;
    unitOfMeasure: string;
    volumeAddedToCart: number;
    slogan: string;
  }>;
  createdAt: string;
}

export interface RouteDoc {
  id: string;
  supplierId: string;
  name: string;
  origin: string;
  destination: string;
  length: number;
  duration: number;
  villages: Array<{
    villageId: string;
    name: string;
    journeyTimeFromOrigin: number;
    location: { latitude: number; longitude: number };
  }>;
}

export interface Gig {
  id: string;
  title: string;
  supplierId: string;
  supplierName: string;
  routeId: string;
  routeName: string;
  villages: Array<{
    villageId: string;
    name: string;
    location: { latitude: number; longitude: number };
  }>;
  villageIds: string[];
  merchantIds: string[];
  vehicleId: string;
  driverName: string;
  pamphletId: string;
  date: string;
  arrivingTimes: Record<string, string>;
  assignedAt: string;
  routeLengthKm: number;
  driverAcknowledgedAt?: string;
  status: "created" | "started" | "completed" | "suspended";
  currentVillageIndex: number;
  currentVillageStatus: "arriving" | "reached" | "left" | "none";
  suspensionReason?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  hsnCode: string;
  unit: string;
}

export interface Order {
  id: string;
  gigId: string;
  supplierId: string;
  buyer: string;
  village: string;
  merchantId: string;
  items: OrderItem[];
  subTotal: number;
  gstRate: number;
  gstAmount: number;
  totalPrice: number;
  supplierGstNumber: string;
  currency: "INR";
  paymentMode: PaymentMode;
  paymentStatus: "paid" | "pending" | "refund_pending" | "refunded";
  deliveryStatus: "placed" | "reached_merchant" | "delivered" | "cancelled" | "suspended";
  pickupCodeIssuedAt: string;
  pickupCodeLastSentAt?: string;
  paymentIntentId?: string;
  paymentTransactionId?: string;
  cashCollectedAmount?: number;
  custodyTransferId?: string;
  refundTransactionIds?: string[];
  refundedAmount?: number;
  suspensionReason?: string;
  createdAt: string;
  invoiceNumber: string;
  invoiceDate: string;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  supplierName: string;
  supplierAddress: string;
  recipientName: string;
  recipientAddress: string;
  recipientShippingAddress: string;
  recipientGstNumber?: string;
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  supplyType: "intra_state" | "inter_state";
  creditNoteId?: string;
  authorizedSignatory: string;
}

export interface HandoverCodeRecord {
  code: string;
  issuedAt: string;
  lastSentAt?: string;
  sendCount: number;
  failedAttempts: number;
}

export interface MerchantOrder {
  id: string;
  gigId: string;
  merchantId: string;
  merchantName: string;
  supplierId: string;
  supplierName: string;
  items: OrderItem[];
  subTotal: number;
  gstRate: number;
  gstAmount: number;
  totalPrice: number;
  currency: "INR";
  paymentMode: MerchantOrderPaymentMode;
  paidWithCredit: boolean;
  status: "placed" | "reached" | "delivered" | "cancelled" | "suspended";
  handoverCodeIssuedAt: string;
  createdAt: string;
  invoiceNumber: string;
  invoiceDate: string;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  supplierAddress: string;
  recipientName: string;
  recipientAddress: string;
  suspensionReason?: string;
}

export interface CreditProfile {
  merchantId: string;
  supplierId: string;
  creditLimit: number;
  creditUsed: number;
  creditAvailable: number;
  pendingRepayments?: number;
  inTransitRepayments?: number;
  provisionalCreditGranted?: number;
  provisionalCreditCap?: number;
  provisionalCreditEnabled?: boolean;
  paymentsMade?: Array<{ id: string; amount: number; date: string; method: string; settled: boolean }>;
  paymentsDue?: Array<{ id: string; amount: number; dueDate: string; status: string }>;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  deepLink?: string;
  relatedEntityId?: string;
  read: boolean;
  createdAt: string;
}

export interface DriverEarning {
  id: string;
  driverId?: string;
  totalEarnings?: number;
  pendingDues?: number;
  reservedForPayout?: number;
  cashInCustody?: number;
  cashRecoverable?: number;
  openSettlementIds?: string[];
  lifetimePaidOut?: number;
}

export interface CatalogResponse {
  countries: Country[];
  states: State[];
  districts: District[];
  subscriptionPlans: Array<Record<string, unknown>>;
  planTariffs: Array<Record<string, unknown>>;
  subscriptionOffers: Array<Record<string, unknown>>;
  offerDiscountCodes: Array<Record<string, unknown>>;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
