"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "en" | "am";
const STORAGE_KEY = "cafeflow_lang";

/**
 * Lightweight i18n for the Amharic (AM) language toggle.
 *
 * - `lang` is persisted to localStorage so the choice survives reloads.
 * - `t(key)` translates static UI strings from the dictionary below.
 * - `tr(en, am)` picks a localized value for data that carries both an English
 *   and an Amharic form (e.g. menu_items.name / name_am). Falls back to English
 *   when the Amharic value is missing.
 */

const DICT: Record<string, { en: string; am: string }> = {
  logout: { en: "Logout", am: "ውጣ" },
  notifications: { en: "Notifications", am: "ማሳወቂያዎች" },
  newOrder: { en: "New Order", am: "አዲስ ትዕዛዝ" },
  cart: { en: "Cart", am: "ጋሪ" },
  table: { en: "Table", am: "ጠረጴዛ" },
  remove: { en: "remove", am: "አስወግድ" },
  notes: { en: "Notes (e.g. no ice)", am: "ማስታወሻ (ለምሳሌ በረዶ የለም)" },
  allergyNote: { en: "⚠ Allergy note", am: "⚠ የአለርጂ ማስታወሻ" },
  sendToKitchen: { en: "Send to Kitchen/Bar", am: "ወደ ማብሰያ/ባር ላክ" },
  sending: { en: "Sending…", am: "በመላክ ላይ…" },
  tapToAdd: { en: "Tap items to add.", am: "ለመጨመር ይንኩ።" },
  menu: { en: "Menu", am: "ምናሌ" },
  add: { en: "Add", am: "ጨምር" },
  placeOrder: { en: "Place Order", am: "ትዕዛዝ አስቀምጥ" },
  orderPlaced: { en: "Order placed!", am: "ትዕዛዝ ተቀምጧል!" },
  waiterConfirm: { en: "A waiter will confirm it shortly.", am: "አስተናጋጅ በቅርቡ ያረጋግጣል።" },
  // KDS
  drinksQueue: { en: "Drinks Queue", am: "የመጠጥ ሰልፍ" },
  kitchenQueue: { en: "Kitchen Queue", am: "የማብሰያ ሰልፍ" },
  laneNew: { en: "New", am: "አዲስ" },
  lanePreparing: { en: "Preparing", am: "በዝግጅት ላይ" },
  laneReady: { en: "Ready", am: "ዝግጁ" },
  start: { en: "Start", am: "ጀምር" },
  plate: { en: "Plate", am: "አስቀምጥ" },
  ready: { en: "Ready", am: "ዝግጁ" },
  accept: { en: "Accept", am: "ተቀበል" },
  orderReady: { en: "Order Ready", am: "ትዕዛዝ ዝግጁ" },
  acknowledge: { en: "Acknowledge", am: "አረጋግጥ" },
  allergy: { en: "ALLERGY", am: "አለርጂ" },
  holdForBar: { en: "Hold — Bar not ready", am: "ቆይ — ባር ዝግጁ አይደለም" },
  noOrders: { en: "No orders.", am: "ምንም ትዕዛዝ የለም።" },
  // Cashier
  billQueue: { en: "Bill Queue", am: "የሂሳብ ሰልፍ" },
  noBills: { en: "No bills waiting.", am: "ምንም ሂሳብ የለም።" },
  selectBill: { en: "Select a bill from the queue.", am: "ከሰልፉ ሂሳብ ይምረጡ።" },
  subtotal: { en: "Subtotal (net)", am: "ንዑስ ድምር" },
  total: { en: "Total", am: "ጠቅላላ" },
  processPayment: { en: "Process payment", am: "ክፍያ ፈጽም" },
  confirmDemo: { en: "✓ Confirm payment (demo)", am: "✓ ክፍያ አረጋግጥ (ሙከራ)" },
  amountTendered: { en: "Amount tendered", am: "የተከፈለ መጠን" },
  customerPhone: { en: "Customer phone", am: "የደንበኛ ስልክ" },
  // Common
  name: { en: "Name", am: "ስም" },
  email: { en: "Email", am: "ኢሜይል" },
  phone: { en: "Phone", am: "ስልክ" },
  address: { en: "Address", am: "አድራሻ" },
  password: { en: "Password", am: "የይለፍ ቃል" },
  status: { en: "Status", am: "ሁኔታ" },
  role: { en: "Role", am: "ሚና" },
  active: { en: "Active", am: "ንቁ" },
  inactive: { en: "Inactive", am: "ቦዝኗል" },
  items: { en: "items", am: "ዕቃዎች" },
  back: { en: "← Back", am: "← ተመለስ" },
  transactions: { en: "Transactions", am: "ግብይቶች" },
  // Waiter
  myTables: { en: "My Tables", am: "የእኔ ጠረጴዛዎች" },
  tapTableHint: { en: "Tap a table to start or add to an order.", am: "ለመጀመር ወይም ለመጨመር ጠረጴዛ ይንኩ።" },
  ordersWord: { en: "order(s)", am: "ትዕዛዝ" },
  myActiveOrders: { en: "My Active Orders", am: "የእኔ ንቁ ትዕዛዞች" },
  delivered: { en: "Delivered", am: "ደረሰ" },
  requestBill: { en: "Request Bill", am: "ሂሳብ ጠይቅ" },
  noActiveOrders: { en: "No active orders.", am: "ንቁ ትዕዛዝ የለም።" },
  incomingQr: { en: "Incoming QR Self-Orders", am: "የሚገቡ QR ራስ-ትዕዛዞች" },
  noPendingQr: { en: "No pending QR orders.", am: "ምንም QR ትዕዛዝ የለም።" },
  confirmFireKds: { en: "Confirm → fire to KDS", am: "አረጋግጥ → ወደ KDS ላክ" },
  // Owner dashboard
  todaysOverview: { en: "Today's Overview", am: "የዛሬ ማጠቃለያ" },
  live: { en: "Live", am: "ቀጥታ" },
  criticalStock: { en: "Critical Stock Alarm", am: "የቆጠራ ማንቂያ" },
  revenue: { en: "Revenue", am: "ገቢ" },
  netProfit: { en: "Net Profit", am: "ተጣራ ትርፍ" },
  ordersKpi: { en: "Orders", am: "ትዕዛዞች" },
  completed: { en: "Completed", am: "ተጠናቅቋል" },
  paymentMethods: { en: "Payment Methods", am: "የክፍያ ዘዴዎች" },
  noPaymentsToday: { en: "No payments yet today.", am: "ዛሬ ክፍያ የለም።" },
  branchComparison: { en: "Branch Comparison", am: "የቅርንጫፍ ንጽጽር" },
  topSellingItems: { en: "Top Selling Items", am: "ከፍተኛ የሚሸጡ ዕቃዎች" },
  noSalesYet: { en: "No sales yet.", am: "ሽያጭ የለም።" },
  sold: { en: "sold", am: "ተሸጧል" },
  // Owner menu
  menuManagement: { en: "Menu Management", am: "የምናሌ አስተዳደር" },
  publishDrafts: { en: "Publish drafts", am: "ረቂቆችን አሳትም" },
  newCategoryLabel: { en: "New category", am: "አዲስ ምድብ" },
  addCategory: { en: "Add category", am: "ምድብ ጨምር" },
  addMenuItem: { en: "Add menu item", am: "የምናሌ ዕቃ ጨምር" },
  selectCategory: { en: "Select category", am: "ምድብ ይምረጡ" },
  nameEn: { en: "Name (EN)", am: "ስም (እንግሊዝኛ)" },
  nameAmPlaceholder: { en: "Name (AM)", am: "ስም (አማርኛ)" },
  priceEtb: { en: "Price (ETB)", am: "ዋጋ (ብር)" },
  kitchenFood: { en: "Kitchen (food)", am: "ማብሰያ (ምግብ)" },
  baristaDrink: { en: "Barista (drink)", am: "ባሪስታ (መጠጥ)" },
  addItemBtn: { en: "Add item", am: "ዕቃ ጨምር" },
  noItems: { en: "No items.", am: "ዕቃ የለም።" },
  markUnavailable: { en: "Mark unavailable", am: "የለም አድርግ" },
  markAvailable: { en: "Mark available", am: "አለ አድርግ" },
  // Owner staff
  staffManagement: { en: "Staff Management", am: "የሠራተኞች አስተዳደር" },
  inviteStaff: { en: "Invite staff", am: "ሠራተኛ ጋብዝ" },
  sendInvite: { en: "Send invite", am: "ግብዣ ላክ" },
  deactivate: { en: "Deactivate", am: "አቦዝን" },
  activate: { en: "Activate", am: "አግብር" },
  profile: { en: "Profile", am: "መገለጫ" },
  editProfile: { en: "Edit Profile", am: "መገለጫ አርትዕ" },
  saveChanges: { en: "Save Changes", am: "ለውጦችን አስቀምጥ" },
  profilePicture: { en: "Profile Picture", am: "የመገለጫ ምስል" },
  age: { en: "Age", am: "ዕድሜ" },
  bio: { en: "Bio", am: "ስለ እኔ" },
  emergencyContact: { en: "Emergency Contact", am: "የአደጋ ጊዜ ተጠሪ" },
  changeRole: { en: "Change Role", am: "ሚና ቀይር" },
  manageRoles: { en: "Manage Roles", am: "ሚናዎችን ያስተዳድሩ" },
  roleUpdated: { en: "Role updated successfully", am: "ሚና በተሳካ ሁኔታ ተቀይሯል" },
  confirmDeactivate: { en: "Are you sure you want to deactivate this staff member?", am: "ይህን ሰራተኛ ማቦዘን እርግጠኛ ነዎት?" },
  searchStaff: { en: "Search staff…", am: "ሠራተኛ ፈልግ…" },
  filterByRole: { en: "Filter by role", am: "በሚና ያጣሩ" },
  allRoles: { en: "All Roles", am: "ሁሉም ሚናዎች" },
  profileUpdated: { en: "Profile updated successfully!", am: "መገለጫዎ በተሳካ ሁኔታ ተዘምኗል!" },
  uploadFailed: { en: "Upload failed", am: "መጫን አልተሳካም" },
  noStaffFound: { en: "No staff members found.", am: "ምንም ሰራተኛ አልተገኘም።" },
  branch: { en: "Branch", am: "ቅርንጫፍ" },
  unassigned: { en: "Unassigned", am: "ያልተመደበ" },
  // Owner branches
  addBranch: { en: "Add branch", am: "ቅርንጫፍ ጨምር" },
  tablesWord: { en: "tables", am: "ጠረጴዛዎች" },
  staffWord: { en: "staff", am: "ሠራተኞች" },
  // Owner reports
  reportsAnalytics: { en: "Reports & Analytics", am: "ሪፖርቶች እና ትንተና" },
  revenueToday: { en: "Revenue (today)", am: "ገቢ (ዛሬ)" },
  ordersToday: { en: "Orders (today)", am: "ትዕዛዞች (ዛሬ)" },
  avgOrderValue: { en: "Avg order value", am: "አማካይ የትዕዛዝ ዋጋ" },
  salesByHour: { en: "Sales by hour (today)", am: "ሽያጭ በሰዓት (ዛሬ)" },
  vatReportTitle: { en: "VAT Report (ERCA, this month)", am: "የቫት ሪፖርት (ERCA, በዚህ ወር)" },
  grossSales: { en: "Gross sales", am: "ጠቅላላ ሽያጭ" },
  netPreVat: { en: "Net (pre-VAT)", am: "ተጣራ (ከቫት በፊት)" },
  // Manager
  operationsDashboard: { en: "Operations Dashboard", am: "የሥራ ዳሽቦርድ" },
  liveOrderFeed: { en: "Live Order Feed", am: "ቀጥታ የትዕዛዝ ዝርዝር" },
  noLiveOrders: { en: "No live orders.", am: "ቀጥታ ትዕዛዝ የለም።" },
  tableStatusMap: { en: "Table Status Map", am: "የጠረጴዛ ሁኔታ ካርታ" },
  inventoryAlerts: { en: "Inventory Alerts", am: "የቆጠራ ማንቂያዎች" },
  liveOrderBoard: { en: "Live Order Board", am: "ቀጥታ የትዕዛዝ ሰሌዳ" },
  voidPin: { en: "Void (PIN)", am: "ሰርዝ (PIN)" },
  lowStockAlerts: { en: "Low Stock Alerts", am: "የዝቅተኛ ቆጠራ ማንቂያዎች" },
  allStockAbove: { en: "All stock above threshold.", am: "ሁሉም ቆጠራ ከገደብ በላይ ነው።" },
  // Shifts (manager + cashier)
  shiftManagement: { en: "Shift Management", am: "የፈረቃ አስተዳደር" },
  openShiftTitle: { en: "Open Shift", am: "ፈረቃ ክፈት" },
  openingFloatPlaceholder: { en: "Opening cash float (ETB)", am: "የመክፈቻ ጥሬ ገንዘብ (ብር)" },
  openShiftBtn: { en: "Open shift", am: "ፈረቃ ክፈት" },
  openingFloat: { en: "Opening float", am: "የመክፈቻ ገንዘብ" },
  cashSales: { en: "Cash sales", am: "የጥሬ ገንዘብ ሽያጭ" },
  digital: { en: "Digital", am: "ዲጂታል" },
  closeShiftReconcile: { en: "Close Shift — Reconciliation", am: "ፈረቃ ዝጋ — ማስታረቅ" },
  expectedCash: { en: "Expected cash", am: "የሚጠበቅ ገንዘብ" },
  actualCashPlaceholder: { en: "Actual counted cash (ETB)", am: "የተቆጠረ ጥሬ ገንዘብ (ብር)" },
  countCloseBtn: { en: "Count drawer & close", am: "ቆጥር እና ዝጋ" },
  shiftRunningTotals: { en: "Shift Running Totals", am: "የፈረቃ ድምሮች" },
  noOpenShift: { en: "No open shift.", am: "ክፍት ፈረቃ የለም።" },
  // Schedule
  weeklySchedule: { en: "Weekly Schedule", am: "ሳምንታዊ መርሐ ግብር" },
  publishScheduleBtn: { en: "Publish schedule", am: "መርሐ ግብር አሳትም" },
  addShift: { en: "Add shift", am: "ፈረቃ ጨምር" },
  selectStaff: { en: "Select staff…", am: "ሠራተኛ ይምረጡ…" },
  morning: { en: "Morning", am: "ጥዋት" },
  afternoon: { en: "Afternoon", am: "ከሰዓት" },
  fullDay: { en: "Full day", am: "ሙሉ ቀን" },
  // Store
  inventoryOverview: { en: "Inventory Overview", am: "የቆጠራ አጠቃላይ እይታ" },
  addIngredient: { en: "Add ingredient", am: "ግብዓት ጨምር" },
  unit: { en: "Unit", am: "መለኪያ" },
  qty: { en: "Qty", am: "ብዛት" },
  minThreshold: { en: "Min threshold", am: "ዝቅተኛ ገደብ" },
  min: { en: "Min", am: "ዝቅተኛ" },
  stockout: { en: "Stockout", am: "ማለቅ" },
  supplier: { en: "Supplier", am: "አቅራቢ" },
  actions: { en: "Actions", am: "ድርጊቶች" },
  receive: { en: "Receive", am: "ተቀበል" },
  adjust: { en: "Adjust", am: "አስተካክል" },
  itemCol: { en: "Item", am: "ዕቃ" },
  supplierDirectory: { en: "Supplier Directory", am: "የአቅራቢዎች ማውጫ" },
  contact: { en: "Contact", am: "ተጠሪ" },
  paymentTerms: { en: "Payment terms", am: "የክፍያ ውል" },
  addSupplier: { en: "Add supplier", am: "አቅራቢ ጨምር" },
  purchaseOrders: { en: "Purchase Orders", am: "የግዢ ትዕዛዞች" },
  poApprovalNote: { en: "POs above 5,000 ETB require Manager/Owner approval before receiving.", am: "ከ5,000 ብር በላይ የግዢ ትዕዛዞች ከመቀበል በፊት የሥራ አስኪያጅ/ባለቤት ፈቃድ ይፈልጋሉ።" },
  approve: { en: "Approve", am: "አጽድቅ" },
  markReceived: { en: "Mark received", am: "እንደተቀበለ ምልክት አድርግ" },
  noPurchaseOrders: { en: "No purchase orders.", am: "የግዢ ትዕዛዝ የለም።" },
  lines: { en: "lines", am: "መስመሮች" },
  inventoryReports30: { en: "Inventory Reports (30 days)", am: "የቆጠራ ሪፖርቶች (30 ቀን)" },
  stockValuation: { en: "Stock valuation", am: "የቆጠራ ግምት" },
  received: { en: "Received", am: "የተቀበለ" },
  consumed: { en: "Consumed", am: "የተበላ" },
  wasted: { en: "Wasted", am: "የባከነ" },
  onHand: { en: "On hand", am: "በእጅ ያለ" },
  value: { en: "Value", am: "ዋጋ" },
  // Auth
  cafeflowLogin: { en: "CafeFlow Login", am: "CafeFlow መግቢያ" },
  posPinLogin: { en: "POS PIN login", am: "POS PIN መግቢያ" },
  emailPassword: { en: "Email & password", am: "ኢሜይል እና የይለፍ ቃል" },
  branchIdPlaceholder: { en: "Branch ID", am: "የቅርንጫፍ መታወቂያ" },
  pin4: { en: "4-digit PIN", am: "4-አሃዝ PIN" },
  signingIn: { en: "Signing in…", am: "በመግባት ላይ…" },
  signIn: { en: "Sign in", am: "ግባ" },
  useEmailPassword: { en: "Use email & password", am: "ኢሜይል እና የይለፍ ቃል ተጠቀም" },
  usePosPin: { en: "Use POS PIN instead", am: "በምትኩ POS PIN ተጠቀም" },
  registerCafe: { en: "Register your Café", am: "ካፌዎን ይመዝግቡ" },
  startsTrial: { en: "Starts a 7-day free trial.", am: "የ7 ቀን ነጻ ሙከራ ይጀምራል።" },
  businessName: { en: "Business name", am: "የንግድ ስም" },
  ownerName: { en: "Owner name", am: "የባለቤት ስም" },
  passwordMin: { en: "Password (min 8 chars)", am: "የይለፍ ቃል (ቢያንስ 8 ቁምፊ)" },
  creating: { en: "Creating…", am: "በመፍጠር ላይ…" },
  createAccount: { en: "Create account", am: "መለያ ፍጠር" },
  // Subscription gate
  subscriptionRequired: { en: "Subscription Required", am: "ምዝገባ ያስፈልጋል" },
  forLabel: { en: "for", am: "ለ" },
  months: { en: "months", am: "ወራት" },
  receiptUnderReview: { en: "Your receipt is under review.", am: "ደረሰኝዎ በመገምገም ላይ ነው።" },
  notifyEmailApproved: { en: "We'll notify you by email once approved.", am: "ከጸደቀ በኋላ በኢሜይል እናሳውቅዎታለን።" },
  transferTo: { en: "Transfer to:", am: "ወደዚህ ያስተላልፉ:" },
  bankLabel: { en: "Bank:", am: "ባንክ:" },
  accountNo: { en: "Account #:", am: "ሂሳብ #:" },
  accountNameLabel: { en: "Account name:", am: "የሂሳብ ስም:" },
  step1: { en: "Transfer the amount to the account above.", am: "መጠኑን ወደ ላይኛው ሂሳብ ያስተላልፉ።" },
  step2: { en: "Take a screenshot / photo of the receipt.", am: "የደረሰኙን ፎቶ ያንሱ።" },
  step3: { en: "Upload it below (JPG/PNG/PDF, max 5MB).", am: "ከታች ይስቀሉት (JPG/PNG/PDF, ቢበዛ 5MB)።" },
  uploading: { en: "Uploading…", am: "በመስቀል ላይ…" },
  sendForApproval: { en: "Send for Approval", am: "ለማጽደቅ ላክ" },
  // Notifications
  noNotifications: { en: "No notifications.", am: "ማሳወቂያ የለም።" },
  // Modals / actions
  cancel: { en: "Cancel", am: "ሰርዝ" },
  confirm: { en: "Confirm", am: "አረጋግጥ" },
  reason: { en: "Reason", am: "ምክንያት" },
  voidOrderTitle: { en: "Void order", am: "ትዕዛዝ ሰርዝ" },
  managerPin: { en: "Manager PIN (4 digits)", am: "የሥራ አስኪያጅ PIN (4 አሃዝ)" },
  reasonForVoid: { en: "Reason for void", am: "የመሰረዝ ምክንያት" },
  confirmVoid: { en: "Confirm void", am: "መሰረዝ አረጋግጥ" },
  receiveDelivery: { en: "Receive delivery", am: "ርክክብ ተቀበል" },
  quantityReceived: { en: "Quantity received", am: "የተቀበለው ብዛት" },
  adjustStock: { en: "Adjust stock", am: "ቆጠራ አስተካክል" },
  adjustmentQty: { en: "Adjustment (+/−)", am: "ማስተካከያ (+/−)" },
  // SaaS admin
  platformOverview: { en: "Platform Overview", am: "የመድረክ አጠቃላይ እይታ" },
  activeTenants: { en: "Active Tenants", am: "ንቁ ተከራዮች" },
  onTrial: { en: "on trial", am: "በሙከራ ላይ" },
  pendingApprovalsKpi: { en: "Pending Approvals", am: "በመጠባበቅ ላይ ያሉ ማጽደቆች" },
  expiring30: { en: "expiring ≤30d", am: "በ≤30 ቀን የሚያበቁ" },
  totalTenantsAllTime: { en: "Total Tenants (all-time)", am: "ጠቅላላ ተከራዮች" },
  platformAdminAccess: { en: "Platform administrator access (MFA-ready)", am: "የመድረክ አስተዳዳሪ መዳረሻ (ለMFA ዝግጁ)" },
  pendingReceiptApprovals: { en: "Pending Receipt Approvals", am: "በመጠባበቅ ላይ ያሉ ደረሰኝ ማጽደቆች" },
  noPendingApprovals: { en: "No pending approvals.", am: "በመጠባበቅ ላይ ያለ ማጽደቅ የለም።" },
  viewReceipt: { en: "View receipt", am: "ደረሰኝ ይመልከቱ" },
  noFile: { en: "No file", am: "ፋይል የለም" },
  verifyApprove: { en: "Verify & Approve", am: "አረጋግጥ እና አጽድቅ" },
  reject: { en: "Reject", am: "ውድቅ አድርግ" },
  rejectReceipt: { en: "Reject receipt", am: "ደረሰኝ ውድቅ አድርግ" },
  rejectionReason: { en: "Rejection reason", am: "የውድቅ ምክንያት" },
  uploaded: { en: "uploaded", am: "ተሰቅሏል" },
  addNewCafe: { en: "Add New Café", am: "አዲስ ካፌ ጨምር" },
  createTenant: { en: "Create tenant", am: "ተከራይ ፍጠር" },
  ownerEmail: { en: "Owner email", am: "የባለቤት ኢሜይል" },
  subEnd: { en: "Sub end", am: "የምዝገባ ማብቂያ" },
  extend7dTrial: { en: "+7d trial", am: "+7 ቀን ሙከራ" },
  suspend: { en: "Suspend", am: "አግድ" },
  platformConfig: { en: "Platform Configuration", am: "የመድረክ ውቅር" },
  saveConfig: { en: "Save config", am: "ውቅር አስቀምጥ" },
  saved: { en: "Saved.", am: "ተቀምጧል።" },
  auditLogTitle: { en: "Audit Log", am: "የማረጋገጫ መዝገብ" },
  when: { en: "When", am: "መቼ" },
  actionCol: { en: "Action", am: "ድርጊት" },
  entity: { en: "Entity", am: "አካል" },
  user: { en: "User", am: "ተጠቃሚ" },
  amountCol: { en: "Amount", am: "መጠን" },
  date: { en: "Date", am: "ቀን" },
  period: { en: "Period", am: "ጊዜ" },
  backTenants: { en: "← Tenants", am: "← ተከራዮች" },
  subscriptionState: { en: "Subscription state", am: "የደንበኝነት ሁኔታ" },
  trialDaysLeft: { en: "Trial days left", am: "የቀሩ የሙከራ ቀናት" },
  subDaysLeft: { en: "Sub days left", am: "የቀሩ የምዝገባ ቀናት" },
  created: { en: "Created", am: "ተፈጥሯል" },
  supportActions: { en: "Actions (support mode)", am: "ድርጊቶች (የድጋፍ ሁኔታ)" },
  extendTrial7: { en: "Extend trial +7d", am: "ሙከራ አራዝም +7 ቀን" },
  terminate: { en: "Terminate", am: "አቋርጥ" },
  subscriptionHistory: { en: "Subscription history", am: "የደንበኝነት ታሪክ" },
  noStaff: { en: "No staff", am: "ሠራተኛ የለም" },
  noBranches: { en: "No branches", am: "ቅርንጫፍ የለም" },
  noSubRecords: { en: "No subscription records", am: "የምዝገባ መዝገብ የለም" },
};

/**
 * Labels supplied by the server as English strings (nav items, role titles).
 * Looked up by their English text via `navLabel`.
 */
const LABELS: Record<string, string> = {
  // Role titles
  Waiter: "አስተናጋጅ",
  Cashier: "ገንዘብ ተቀባይ",
  "Cafe Owner": "የካፌ ባለቤት",
  "Cafe Manager": "የካፌ ሥራ አስኪያጅ",
  Barista: "ባሪስታ",
  Kitchen: "ማብሰያ",
  "Store Manager": "የመጋዘን ሥራ አስኪያጅ",
  // Nav items
  Tables: "ጠረጴዛዎች",
  "My Orders": "የእኔ ትዕዛዞች",
  "QR Orders": "QR ትዕዛዞች",
  Dashboard: "ዳሽቦርድ",
  Menu: "ምናሌ",
  Staff: "ሠራተኞች",
  Branches: "ቅርንጫፎች",
  Reports: "ሪፖርቶች",
  Shift: "ፈረቃ",
  Orders: "ትዕዛዞች",
  Inventory: "ቆጠራ",
  Schedule: "መርሐ ግብር",
  Suppliers: "አቅራቢዎች",
  Payments: "ክፍያዎች",
  // SaaS admin nav + title
  "SaaS Admin": "SaaS አስተዳዳሪ",
  Tenants: "ተከራዮች",
  Approvals: "ማጽደቆች",
  Config: "ውቅር",
  "Audit Log": "የማረጋገጫ መዝገብ",
};

/**
 * Status / enum codes coming from the DB (order status, table status, inventory
 * level, PO status, etc.). Looked up by their raw code via `statusLabel`, which
 * returns a clean English label or the Amharic form. Unknown codes pass through.
 */
const STATUS: Record<string, { en: string; am: string }> = {
  // Order status
  DRAFT: { en: "Draft", am: "ረቂቅ" },
  SUBMITTED: { en: "Submitted", am: "ቀርቧል" },
  IN_PREPARATION: { en: "In preparation", am: "በዝግጅት ላይ" },
  PARTIALLY_READY: { en: "Partially ready", am: "በከፊል ዝግጁ" },
  READY: { en: "Ready", am: "ዝግጁ" },
  DELIVERED: { en: "Delivered", am: "ደርሷል" },
  BILL_REQUESTED: { en: "Bill requested", am: "ሂሳብ ተጠይቋል" },
  PAYMENT_PENDING: { en: "Payment pending", am: "ክፍያ በመጠባበቅ ላይ" },
  COMPLETED: { en: "Completed", am: "ተጠናቅቋል" },
  VOIDED: { en: "Voided", am: "ተሰርዟል" },
  REFUNDED: { en: "Refunded", am: "ተመላሽ ተደርጓል" },
  // Order item status
  NEW: { en: "New", am: "አዲስ" },
  ACCEPTED: { en: "Accepted", am: "ተቀብሏል" },
  PREPARING: { en: "Preparing", am: "በማዘጋጀት ላይ" },
  PLATING: { en: "Plating", am: "በማቅረብ ላይ" },
  // Table status
  available: { en: "Available", am: "ነጻ" },
  occupied: { en: "Occupied", am: "ተይዟል" },
  attention: { en: "Attention", am: "ትኩረት ይፈልጋል" },
  dirty: { en: "Dirty", am: "ቆሻሻ" },
  // Inventory level
  OK: { en: "OK", am: "ጥሩ" },
  LOW: { en: "Low", am: "ዝቅተኛ" },
  CRITICAL: { en: "Critical", am: "አሳሳቢ" },
  // Purchase order status
  PENDING_APPROVAL: { en: "Pending approval", am: "ለማጽደቅ በመጠባበቅ ላይ" },
  APPROVED: { en: "Approved", am: "ጸድቋል" },
  SENT: { en: "Sent", am: "ተልኳል" },
  RECEIVED: { en: "Received", am: "ተቀብሏል" },
  CANCELLED: { en: "Cancelled", am: "ተሰርዟል" },
  // Payment / subscription record status
  PENDING: { en: "Pending", am: "በመጠባበቅ ላይ" },
  CONFIRMED: { en: "Confirmed", am: "ተረጋግጧል" },
  FAILED: { en: "Failed", am: "አልተሳካም" },
  REJECTED: { en: "Rejected", am: "ውድቅ ተደርጓል" },
  // Menu item / schedule state
  PUBLISHED: { en: "Published", am: "ታትሟል" },
  SWAP_REQUESTED: { en: "Swap requested", am: "ለውጥ ተጠይቋል" },
  // Tenant + subscription state
  active: { en: "Active", am: "ንቁ" },
  suspended: { en: "Suspended", am: "ታግዷል" },
  terminated: { en: "Terminated", am: "ተቋርጧል" },
  TRIAL: { en: "Trial", am: "ሙከራ" },
  ACTIVE: { en: "Active", am: "ንቁ" },
  WARNING: { en: "Warning", am: "ማስጠንቀቂያ" },
  GRACE: { en: "Grace", am: "የማቆያ ጊዜ" },
  EXPIRED: { en: "Expired", am: "ጊዜው አልፏል" },
  SUSPENDED: { en: "Suspended", am: "ታግዷል" },
  // Shift status
  OPEN: { en: "Open", am: "ክፍት" },
  CLOSED: { en: "Closed", am: "ተዘግቷል" },
};

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: keyof typeof DICT) => string;
  tr: (en: string, am?: string | null) => string;
  navLabel: (en: string) => string;
  statusLabel: (code: string) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Lang | null) : null;
    if (saved === "am" || saved === "en") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  }, []);

  const toggle = useCallback(() => setLang(lang === "en" ? "am" : "en"), [lang, setLang]);

  const t = useCallback((key: keyof typeof DICT) => {
    const entry = DICT[key];
    if (!entry) return String(key);
    return lang === "am" ? entry.am : entry.en;
  }, [lang]);

  const tr = useCallback((en: string, am?: string | null) => (lang === "am" && am ? am : en), [lang]);

  const navLabel = useCallback((en: string) => (lang === "am" && LABELS[en] ? LABELS[en] : en), [lang]);

  const statusLabel = useCallback(
    (code: string) => {
      const entry = STATUS[code];
      if (!entry) return code;
      return lang === "am" ? entry.am : entry.en;
    },
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, toggle, t, tr, navLabel, statusLabel }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used within <LangProvider>");
  return ctx;
}
