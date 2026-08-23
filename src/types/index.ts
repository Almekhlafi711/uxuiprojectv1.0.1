export type Role =
  | "REPRESENTATIVE"
  | "SUPERVISOR"
  | "SALES_MANAGER"
  | "DISTRIBUTION_OFFICER"
  | "DISTRIBUTOR"
  | "WAREHOUSE"
  | "FINANCE"
  | "GENERAL_MANAGER"
  | "SYSTEM_ADMIN"
  | "AUDITOR"
  | "HR";

export type AuthorityClass = "operational" | "operational-administrative" | "business" | "administrative" | "technical" | "compliance";

export interface RoleDefinition {
  id: Role;
  nameAr: string;
  description: string;
  level: number;
  authority: AuthorityClass;
  scope: "self" | "team" | "branch" | "entity" | "network" | "people" | "read" | "system" | "admin" | "none";
}

export type Status =
  | "active"
  | "inactive"
  | "pending"
  | "approved"
  | "rejected"
  | "returned"
  | "draft"
  | "completed"
  | "cancelled"
  | "suspended"
  | "overdue"
  | "submitted"
  | "under_review"
  | "inspection"
  | "posted"
  | "received"
  | "sent"
  | "executed"
  | "partially_paid"
  | "in_transit"
  | "damaged"
  | "reserved"
  | "delivered"
  | "in_progress"
  | "failed"
  | "closed"
  | "locked"
  | "issued"
  | "transferred"
  | "paid"
  | "partial"
  | "unpaid"
  | "converted"
  | "paused"
  | "synced";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  territoryId?: string;
  branchId?: string;
  supervisorId?: string;
  distributorId?: string;
  status: "active" | "inactive" | "suspended";
  joinedAt: string;
  lastActiveAt?: string;
  avatarColor?: string;
}

export interface Permission {
  code: string;
  nameAr: string;
  module: string;
}

export interface Territory {
  id: string;
  name: string;
  branchId: string;
  supervisorId?: string;
  repIds: string[];
  customerCount: number;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  managerId?: string;
}

export interface CostCenter {
  id: string;
  name: string;
  branchId: string;
  code: string;
}

export interface ContactPerson {
  name: string;
  jobTitle: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  type: "retailer" | "wholesaler" | "supermarket" | "restaurant" | "kiosk";
  territoryId: string;
  repId: string;
  supervisorId: string;
  phone: string;
  address: string;
  balance: number;
  creditLimit: number;
  paymentTerms: "cash" | "credit_7" | "credit_15" | "credit_30";
  status: Status;
  lastVisitAt?: string;
  visitedCount: number;
  lat: number;
  lng: number;
  createdAt: string;
  notes?: string;
  targetFlag?: boolean;
  /** B2B identity fields */
  legalName?: string;
  commercialReg?: string;
  taxNumber?: string;
  sector?: string;
  city?: string;
  email?: string;
  mobile?: string;
  contactPerson?: ContactPerson;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  brand: string;
  unit: string;
  packSize: string;
  costPrice: number;
  sellPrice: number;
  discountRate: number;
  status: "active" | "inactive";
  reorderLevel: number;
  /** Barcode سياسة الشركة: وحدة (EAN13/UPC) — مسح جوال أساسي */
  barcode?: string;
  /** باركود الكرتون/الطرد — سياسة الشركة: كرتون له باركود منفصل */
  barcodeCarton?: string;
  /** عدد الوحدات داخل الكرتون (للتحويل التلقائي عند مسح كرتون) */
  unitsPerCarton?: number;
}

export interface PriceList {
  id: string;
  name: string;
  effectiveFrom: string;
  items: { productId: string; price: number }[];
  status: Status;
}

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  repId: string;
  type: "cash" | "credit";
  status: Status;
  date: string;
  total: number;
  discount: number;
  net: number;
  paid: number;
  items: SalesOrderLine[];
  notes?: string;
}

export interface SalesOrderLine {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  cost: number;
  discountRate: number;
  lineTotal: number;
}

export interface Invoice extends SalesOrder {
  invoiceNumber: string;
  dueDate?: string;
  paymentStatus: "paid" | "partial" | "unpaid";
}

export interface Collection {
  id: string;
  number: string;
  customerId: string;
  repId: string;
  amount: number;
  method: "cash" | "transfer" | "pos" | "check";
  date: string;
  invoiceIds: string[];
  cashBoxId: string;
  status: Status;
  notes?: string;
}

export interface ReturnRecord {
  id: string;
  number: string;
  invoiceId: string;
  customerId: string;
  repId: string;
  date: string;
  items: ReturnLine[];
  condition: "good" | "damaged";
  totalAmount: number;
  status: Status;
  reason: string;
}

export type ReturnStatus =
  | "draft"
  | "submitted"
  | "inspection"
  | "approved"
  | "rejected"
  | "returned_for_correction"
  | "posted";
export interface ReturnLifecycle { status: ReturnStatus; updatedAt: string; updatedBy: string; note?: string; }

export interface ReturnLine {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  lineTotal: number;
}

export interface Warehouse {
  id: string;
  name: string;
  branchId: string;
  keeperId?: string;
}

export interface StockItem {
  productId: string;
  productName: string;
  warehouseId: string;
  available: number;
  reserved: number;
  damaged: number;
  inTransit: number;
  reorderLevel: number;
  costPrice: number;
}

export interface VanStock {
  repId: string;
  items: { productId: string; productName: string; qty: number; damagedQty: number }[];
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  type: "receiving" | "issue" | "transfer_out" | "transfer_in" | "return_in" | "damage" | "count_adjust";
  productId: string;
  productName: string;
  qty: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  repId?: string;
  date: string;
  refNumber: string;
  createdBy: string;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  number: string;
  status: Status;
  fromWarehouseId: string;
  toWarehouseId?: string;
  toRepId?: string;
  items: { productId: string; productName: string; qty: number }[];
  createdBy: string;
  date: string;
  approvedBy?: string;
  notes?: string;
}

export type TransferStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "sent"
  | "in_transit"
  | "received"
  | "accepted"
  | "rejected"
  | "returned_for_correction";
export interface TransferLifecycle { status: TransferStatus; updatedAt: string; updatedBy: string; note?: string; }

export interface StockRequest {
  id: string;
  number: string;
  repId: string;
  status: Status;
  items: { productId: string; productName: string; qty: number }[];
  date: string;
  warehouseId: string;
  notes?: string;
}

export interface CashBox {
  id: string;
  name: string;
  type: "rep" | "supervisor" | "main";
  ownerId?: string;
  balance: number;
}

export interface CashMovement {
  id: string;
  number: string;
  type: "collection_in" | "rep_deposit" | "supervisor_receipt" | "expense" | "adjustment";
  amount: number;
  cashBoxId: string;
  relatedRepId?: string;
  date: string;
  notes?: string;
  createdBy: string;
}

export interface RoutePlan {
  id: string;
  name: string;
  territoryId: string;
  repId: string;
  visitDays: number[];
  status: Status;
  approvedBy?: string;
  createdAt: string;
  customers: RouteCustomer[];
}

export interface RouteCustomer {
  customerId: string;
  order: number;
  visitDays: number[];
}

export interface Visit {
  id: string;
  customerId: string;
  repId: string;
  date: string;
  planned: boolean;
  checkInAt?: string;
  checkOutAt?: string;
  result: "visited" | "not_found" | "closed" | "no_sale" | "completed";
  outcome?: string;
  notes?: string;
  salesOrderId?: string;
  collectionId?: string;
  lat: number;
  lng: number;
  distanceFromRoute?: number;
}

export interface GpsLocation {
  userId: string;
  lat: number;
  lng: number;
  updatedAt: string;
  speed?: number;
}

export interface Target {
  id: string;
  period: "daily" | "weekly" | "monthly" | "yearly";
  ownerId: string;
  ownerType: "rep" | "supervisor" | "team" | "territory";
  salesAmount: number;
  collectionAmount: number;
  visitsCount: number;
  newCustomersCount: number;
  startDate: string;
  endDate: string;
  status: Status;
  approvedBy?: string;
  createdAt: string;
  /** SUP-04 quantitative targets: per-product unit/carton goals. */
  lines?: TargetLine[];
}

/** Quantitative product target line (SUP-04). */
export interface TargetLine {
  productId: string;
  productName: string;
  quantity: number;
  unit: "unit" | "carton";
}

export interface ApprovalRequest {
  id: string;
  number: string;
  type:
    | "discount"
    | "credit_override"
    | "stock_transfer"
    | "route_plan"
    | "target"
    | "leave"
    | "custody"
    | "archive_change"
    | "price_change"
    | "customer_transfer"
    | "target_org"
    | "deposit"
    | "closing";
  title: string;
  description: string;
  requestedBy: string;
  requestedById: string;
  date: string;
  status: Status;
  currentLevel: number;
  totalLevels: number;
  amount?: number;
  relatedId?: string;
  priority: "low" | "normal" | "high";
  steps: ApprovalStep[];
}

export interface ApprovalStep {
  level: number;
  role: Role;
  status: "pending" | "approved" | "rejected";
  by?: string;
  at?: string;
  note?: string;
}

export interface ProfitabilityRecord {
  id: string;
  period: string;
  territoryId?: string;
  repId?: string;
  supervisorId?: string;
  teamId?: string;
  distributorId?: string;
  distributionOfficerId?: string;
  productId?: string;
  customerId?: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  margin: number;
  returnsAmount: number;
  discountsAmount: number;
}

/** Source transparency — explains where a cost/revenue figure came from. */
export interface SourceDetail {
  source: string;
  formula: string;
  period: string;
  scope: string;
  lastUpdated: string;
  calculationDetails?: string;
}

/** Diagnosis item — explains why a rep/team/territory is profitable or not. */
export interface DiagnosisItem {
  id: string;
  severity: "success" | "warning" | "danger";
  category: "revenue" | "cost" | "efficiency" | "collection";
  message: string;
  recommendation?: string;
  source: SourceDetail;
}

/** Single cost line with full source transparency. */
export interface CostAllocationEntry {
  id: string;
  costType: "salary" | "vehicle" | "fuel" | "phone" | "other" | "commission" | "supervision" | "overhead";
  label: string;
  amount: number;
  source: SourceDetail;
}

/** Enhanced team profitability with full P&L chain. */
export interface TeamProfitability {
  teamId: string;
  teamName: string;
  supervisorId: string;
  supervisorName: string;
  period: string;
  repCount: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  directCosts: number;
  allocatedCosts: number;
  contributionProfit: number;
  allocatedProfit: number;
  netProfit: number;
  netMargin: number;
  targetAchievement: number;
  classification: "excellent" | "profitable" | "low_margin" | "review" | "unprofitable";
  costBreakdown: CostAllocationEntry[];
  diagnosis: DiagnosisItem[];
}

/** Enhanced territory profitability with coverage metrics. */
export interface TerritoryProfitabilityFull {
  territoryId: string;
  territoryName: string;
  branchName: string;
  period: string;
  repCount: number;
  teamCount: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  directCosts: number;
  allocatedCosts: number;
  contributionProfit: number;
  allocatedProfit: number;
  netProfit: number;
  netMargin: number;
  customerCount: number;
  customerCoverage: number;
  costPerVisit: number;
  costPerCustomer: number;
  revenuePerCustomer: number;
  profitPerCustomer: number;
  targetAchievement: number;
  classification: "excellent" | "profitable" | "low_margin" | "review" | "unprofitable";
  costBreakdown: CostAllocationEntry[];
  diagnosis: DiagnosisItem[];
}

export interface CustodyRecord {
  id: string;
  assetType: "car" | "phone" | "tablet" | "pos" | "printer" | "cashbox";
  assetName: string;
  serialNumber: string;
  assignedToId: string;
  assignedToRole: Role;
  issuedAt: string;
  returnedAt?: string;
  condition: "good" | "needs_maintenance" | "damaged" | "lost";
  notes?: string;
  status: "issued" | "returned" | "transferred";
}

/** Objection raised by a rep against a custody record (e.g., damage noticed on receipt). */
export interface CustodyObjection {
  id: string;
  custodyId: string;
  repId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface ArchiveRecord {
  id: string;
  title: string;
  type: string;
  entityType: string;
  entityId: string;
  version: number;
  status: "draft" | "submitted" | "approved" | "locked" | "rejected";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  locked: boolean;
  reason?: string;
}

/** SUP-16 asset handover request raised by a supervisor. */
export type AssetRequestStatus =
  | "draft"
  | "submitted"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "returned"
  | "ready_for_handover"
  | "handed_over"
  | "archived";

export interface AssetRequest {
  id: string;
  number: string;
  assetType: "car" | "phone" | "tablet" | "pos" | "printer" | "cashbox";
  assetName?: string;
  assetNumber?: string;
  beneficiaryId: string;
  beneficiaryName: string;
  requestedById: string;
  requestedBy: string;
  reason: string;
  expectedDate?: string;
  notes?: string;
  status: AssetRequestStatus;
  date: string;
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  handedOverAt?: string;
  archivedAt?: string;
  attachments?: string[];
}

/** SUP-09 supervisor note attached to a representative. */
export interface SupervisorNote {
  id: string;
  repId: string;
  authorId: string;
  type: "performance" | "administrative" | "operational";
  date: string;
  body: string;
  attachments?: string[];
  visibility: "private" | "team" | "manager";
}

/** SUP-13 customer transfer between representatives. */
export interface CustomerTransferRecord {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  previousRepId: string;
  previousRep: string;
  newRepId: string;
  newRep: string;
  effectiveDate: string;
  reason: string;
  debtResponsibility: "previous_rep" | "new_rep" | "policy";
  transferredById: string;
  transferredAt: string;
  status: "pending" | "approved" | "rejected" | "executed";
  approvedBy?: string;
  rejectionReason?: string;
  auditTrail?: { at: string; by: string; action: string; note?: string }[];
}

/** SUP-22 Customer Suspension Record — historical, no deletion. */
export interface CustomerSuspension {
  id: string;
  customerId: string;
  customerName: string;
  reason: string;
  status: "suspended" | "active";
  suspendedBy: string;
  suspendedAt: string;
  effectiveDate: string;
  previousStatus: "active" | "inactive";
  debtAtSuspension?: number;
  history: { at: string; by: string; from: string; to: string; reason: string }[];
}

/** B2B prospect — Target Organization submitted by a representative. */
export interface TargetOrganization {
  id: string;
  code: string;
  orgType: string;
  name: string;
  legalName?: string;
  commercialReg?: string;
  taxNumber?: string;
  mainActivity?: string;
  city: string;
  district?: string;
  address?: string;
  phones: string[];
  email?: string;
  contactPerson?: ContactPerson;
  expectedProducts?: string;
  expectedVolume?: string;
  expectedFrequency?: string;
  currentSupplier?: string;
  paymentTerms?: "cash" | "credit_7" | "credit_15" | "credit_30";
  creditRequirement?: string;
  notes?: string;
  territoryId: string;
  requestedById: string;
  supervisorId: string;
  date: string;
  status: "draft" | "under_review" | "approved" | "rejected" | "converted";
  rejectionReason?: string;
  duplicateOfId?: string;
  convertedToCustomerId?: string;
  attachments?: string[];
}

/** A field trip (jour) executed by a representative for a given day. */
export interface Trip {
  id: string;
  number: string;
  repId: string;
  date: string;
  planId?: string;
  routeId?: string;
  territoryId?: string;
  vehicle?: { id: string; plate: string; model: string; assigned: boolean };
  gpsEnabled: boolean;
  startTime?: string;
  endTime?: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  distanceKm?: number;
  status: "planned" | "in_progress" | "paused" | "completed" | "cancelled";
  syncState: "pending" | "synced";
}

export interface TripExpense {
  id: string;
  number: string;
  tripId: string;
  repId: string;
  date: string;
  type: "fuel" | "parking" | "tolls" | "meals" | "phone" | "other";
  amount: number;
  paymentMethod: "cash" | "transfer" | "pos";
  note?: string;
  status: "pending" | "approved" | "rejected";
}

/** Ordered daily visit plan derived from a route plan. */
export interface DailyPlanEntry {
  customerId: string;
  order: number;
  plannedTime?: string;
  visitId?: string;
  status: "pending" | "visited" | "completed" | "not_found" | "closed" | "skipped";
  reason?: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  repId: string;
  routeId?: string;
  territoryId: string;
  supervisorId: string;
  entries: DailyPlanEntry[];
  salesTarget: number;
  collectionTarget: number;
  visitsTarget: number;
  source: "route" | "manual";
  status: "pending" | "submitted" | "approved" | "completed";
  approvedBy?: string;
  note?: string;
}

/** End-of-day cash/inventory reconciliation. */
export interface DailyClosing {
  id: string;
  number: string;
  repId: string;
  date: string;
  tripId?: string;
  status: "draft" | "submitted" | "approved" | "returned";
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
  salesCount: number;
  collectionCount: number;
  returnCount: number;
  expenseTotal: number;
  depositAmount: number;
  inventoryVarianceItems: { productId: string; productName: string; systemQty: number; physicalQty: number; variance: number }[];
  notes?: string;
  submittedAt?: string;
  approvedBy?: string;
}

export interface SyncQueueItem {
  id: string;
  entityType:
    | "sale"
    | "collection"
    | "return"
    | "visit"
    | "expense"
    | "closing"
    | "trip"
    | "target_org"
    | "stock_count"
    | "deposit";
  entityId: string;
  entityNumber?: string;
  operation: "create" | "update";
  status: "pending" | "in_progress" | "synced" | "failed";
  createdAt: string;
  syncedAt?: string;
  retries?: number;
  error?: string;
}

/** Stock receiving against a stock request / transfer. */
export interface LoadingOrder {
  id: string;
  number: string;
  repId: string;
  warehouseId: string;
  transferId?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  items: { productId: string; productName: string; expectedQty: number; receivedQty: number; condition: "good" | "damaged" }[];
  date: string;
  completedAt?: string;
}

/** Physical vs system van-stock count. */
export interface InventoryCount {
  id: string;
  number: string;
  repId: string;
  date: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  items: { productId: string; productName: string; systemQty: number; physicalQty: number; variance: number; reason?: string }[];
  submittedAt?: string;
  approvedBy?: string;
}

/** Rep cash deposit to supervisor/main box. */
export interface DepositRequest {
  id: string;
  number: string;
  repId: string;
  amount: number;
  date: string;
  toBoxId: string;
  method: "cash" | "transfer";
  reference?: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  notes?: string;
}

export interface Conversation {
  id: string;
  subject: string;
  participants: string[];
  lastMessageAt: string;
  messages: Message[];
  /** Type of conversation: direct (1:1), group, or broadcast */
  type?: "direct" | "group" | "broadcast";
  /** User ID who created the conversation */
  createdBy?: string;
  /** User IDs who have read the last message */
  readBy?: string[];
  /** For broadcasts: the audience description */
  audienceLabel?: string;
  /** For broadcasts: target audience type */
  audienceType?: "team" | "territory" | "branch" | "all_reps" | "selected" | "department";
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  sentAt: string;
  attachments: string[];
  /** Whether the recipient(s) have read this message */
  read?: boolean;
  /** When the message was read */
  readAt?: string;
  /** Message priority */
  priority?: "normal" | "high" | "urgent";
  /** Message type */
  msgType?: "direct" | "broadcast" | "system";
  /** For system messages: related entity */
  systemEvent?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: "annual" | "sick" | "emergency" | "unpaid";
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: Status;
  requestedAt: string;
  approvedBy?: string;
  steps: ApprovalStep[];
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  priority: "low" | "normal" | "high";
  type: string;
  read: boolean;
  relatedPath?: string;
  /** Scope target: when set, only this user may see the notification. When unset it is a managerial broadcast. */
  recipientId?: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  at: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface Team {
  id: string;
  name: string;
  supervisorId: string;
  territoryIds: string[];
  repIds: string[];
}

export interface Distributor {
  id: string;
  name: string;
  territoryIds: string[];
  type?: "internal" | "external" | "managed";
  status?: "active" | "inactive" | "suspended";
  contactName?: string;
  phone?: string;
  email?: string;
  creditLimit?: number;
  balance?: number;
  branchId?: string;
}

export interface DistributorOfficer {
  id: string;
  name: string;
  distributorIds: string[];
}

export type DistributorOrderStatus = "draft" | "confirmed" | "shipped" | "received" | "cancelled";

export interface DistributorSellInOrder {
  id: string;
  distributorId: string;
  distributorName: string;
  date: string;
  status: DistributorOrderStatus;
  items: { productId: string; productName: string; qty: number; unitPrice: number }[];
  total: number;
  createdBy: string;
}

export interface DistributorSellOut {
  id: string;
  distributorId: string;
  date: string;
  customerName: string;
  items: { productId: string; productName: string; qty: number; amount: number }[];
  total: number;
}

export interface NotificationTemplate {
  id: string;
  event: string;
  title: string;
  description: string;
  channels: string[];
  enabled: boolean;
}

export interface AuditSettings {
  sensitiveEntities: string[];
  retentionDays: number;
}

/** Commission & Bonus (Chapter 3.12 / UC-12 / BR-COM-001..003). */

export type CommissionBasis =
  | "net_sales"
  | "collections"
  | "gross_profit"
  | "target"
  | "hybrid";

export type CommissionRunStatus =
  | "provisional"
  | "under_review"
  | "final"
  | "approved"
  | "exported";

export interface CommissionPolicy {
  id: string;
  name: string;
  basis: CommissionBasis;
  /** Percent rate applied to the basis amount. */
  rate: number;
  period: "monthly" | "weekly";
  /** Minimum achieved target ratio (0..1) before commission is paid. */
  targetThreshold: number;
  effectiveFrom: string;
  effectiveTo?: string;
  version: number;
  active: boolean;
}

export interface CommissionLine {
  repId: string;
  repName: string;
  /** Gross sales for the period before returns. */
  grossSales: number;
  returns: number;
  /** Net sales after returns. */
  netSales: number;
  /** Collections received in the period. */
  collections: number;
  /** Gross profit attributed to the rep. */
  grossProfit: number;
  /** Target achievement ratio (0..1). */
  targetAchievement: number;
  /** Basis amount the rate is applied to. */
  baseAmount: number;
  rate: number;
  amount: number;
}

export interface CommissionRun {
  id: string;
  period: string;
  policyId: string;
  basis: CommissionBasis;
  status: CommissionRunStatus;
  lines: CommissionLine[];
  totalAmount: number;
  createdAt: string;
  underReviewAt?: string;
  finalizedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  exportedAt?: string;
}

export type BonusRunStatus = "draft" | "approved" | "paid";

export interface BonusPolicy {
  id: string;
  name: string;
  /** Metric the bonus rewards. */
  metric: "target_achievement" | "new_customers" | "collections_ratio" | "route_coverage";
  /** Minimum metric value to qualify. */
  minThreshold: number;
  /** Flat amount paid per qualifying rep. */
  amount: number;
  period: "monthly" | "quarterly";
  effectiveFrom: string;
  version: number;
  active: boolean;
}

export interface BonusLine {
  repId: string;
  repName: string;
  metricValue: number;
  qualifies: boolean;
  amount: number;
}

export interface BonusRun {
  id: string;
  period: string;
  policyId: string;
  status: BonusRunStatus;
  lines: BonusLine[];
  totalAmount: number;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
}

/** Stock balance record derived from movements (Balance = Previous + Inbound − Outbound ± Adjustments). */
export interface StockBalance {
  productId: string;
  productName: string;
  warehouseId: string;
  previousBalance: number;
  inbound: number;
  outbound: number;
  adjustments: number;
  currentBalance: number;
  lastUpdated: string;
}

/** End-of-day cash settlement submitted by supervisor or rep. */
export interface CashSettlement {
  id: string;
  number: string;
  cashBoxId: string;
  repId?: string;
  date: string;
  openingBalance: number;
  totalCollections: number;
  totalDeposits: number;
  totalExpenses: number;
  closingBalance: number;
  variance: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

/** Vehicle/responsibility assignment to a representative. */
export interface ResponsibleAssignment {
  id: string;
  repId: string;
  repName: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  assignedAt: string;
  assignedBy: string;
  releasedAt?: string;
  status: "active" | "released";
  notes?: string;
}

/** Discount request submitted for approval. */
export interface DiscountRequest {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  repId: string;
  type: "line" | "order" | "global";
  amount: number;
  percentage?: number;
  reason: string;
  invoiceId?: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  requestedById: string;
  requestedByName: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

/** Organization-level configurable ERP policies (Models A/B/C/D). */
export interface OrganizationConfig {
  id: string;
  model: "A" | "B" | "C" | "D";
  stockResponsibility: "rep" | "company";
  vehicleAssignment: "dedicated" | "shared" | "none";
  dailyClosing: boolean;
  stockCarryForward: boolean;
  loadingApproval: "supervisor" | "warehouse" | "auto";
  transferReceiving: "rep" | "supervisor" | "warehouse";
  returnInspection: "mandatory" | "optional";
  updatedBy?: string;
  updatedAt?: string;
}

/** Rep operating cost configuration for profitability analysis. */
export interface RepCostConfig {
  id: string;
  repId: string;
  repName: string;
  salary: number;
  vehicleCost: number;
  fuelAllowance: number;
  phoneAllowance: number;
  otherAllowance: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

/** Generic file attachment record. */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  entityType?: string;
  entityId?: string;
}

// ─── Organization & Distribution Management Types ───

/** سجل تعيين المندوب في منطقة/فريق */
export interface RepresentativeAssignment {
  id: string;
  repId: string;
  repName: string;
  territoryId: string;
  territoryName: string;
  supervisorId: string;
  supervisorName: string;
  branchId: string;
  branchName: string;
  teamId?: string;
  teamName?: string;
  assignedAt: string;
  assignedBy: string;
  assignedByName: string;
  releasedAt?: string;
  releasedBy?: string;
  releasedByName?: string;
  status: "active" | "released";
  reason: string;
  notes?: string;
}

/** سجل تعيين العميل لمندوب */
export interface CustomerAssignment {
  id: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  repId: string;
  repName: string;
  territoryId: string;
  territoryName: string;
  supervisorId: string;
  supervisorName: string;
  assignedAt: string;
  assignedBy: string;
  assignedByName: string;
  releasedAt?: string;
  releasedBy?: string;
  releasedByName?: string;
  status: "active" | "released";
  reason: string;
  notes?: string;
}

/** سجل تدقيق التغييرات التنظيمية */
export interface OrganizationAuditLog {
  id: string;
  entityType: "rep" | "supervisor" | "territory" | "team" | "customer" | "branch";
  entityId: string;
  entityName: string;
  action: "create" | "update" | "assign" | "reassign" | "transfer" | "activate" | "suspend";
  performedBy: string;
  performedByName: string;
  performedAt: string;
  details: Record<string, { old?: string | number | boolean | null; new?: string | number | boolean | null }>;
  notes?: string;
}

/** نتيجة التحقق قبل النقل */
export interface PreTransferValidation {
  canTransfer: boolean;
  blockers: string[];
  warnings: string[];
  pendingItems: {
    sales: number;
    collections: number;
    returns: number;
    custody: number;
    cashbox: number;
    inventory: number;
    goals: number;
    routes: number;
    visits: number;
  };
}

/** عقدة في شجرة التنظيم */
export interface OrganizationTreeNode {
  id: string;
  name: string;
  type: "branch" | "territory" | "team" | "rep";
  repCount?: number;
  customerCount?: number;
  supervisorName?: string;
  children?: OrganizationTreeNode[];
}

/** Customer Transfer Request (extended) */
export interface CustomerTransferRequest {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  previousRepId: string;
  previousRepName: string;
  previousTerritoryId: string;
  previousTerritoryName: string;
  newRepId: string;
  newRepName: string;
  newTerritoryId: string;
  newTerritoryName: string;
  effectiveDate: string;
  reason: string;
  debtResponsibility: "previous_rep" | "new_rep" | "policy";
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected" | "executed";
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  executedAt?: string;
  validation?: PreTransferValidation;
  auditTrail: { at: string; by: string; byName: string; action: string; note?: string }[];
}