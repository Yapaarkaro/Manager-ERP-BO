import AsyncStorage from '@react-native-async-storage/async-storage';

export function toTitleCase(str: string | undefined | null): string {
  if (!str) return '';
  const minorWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'];
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index === 0 || !minorWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

export function getStateCode(stateName: string): string {
  const stateCodeMap: { [key: string]: string } = {
    'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS', 'Bihar': 'BR',
    'Chhattisgarh': 'CG', 'Goa': 'GA', 'Gujarat': 'GJ', 'Haryana': 'HR',
    'Himachal Pradesh': 'HP', 'Jharkhand': 'JH', 'Karnataka': 'KA', 'Kerala': 'KL',
    'Madhya Pradesh': 'MP', 'Maharashtra': 'MH', 'Manipur': 'MN', 'Meghalaya': 'ML',
    'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OD', 'Punjab': 'PB',
    'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN', 'Telangana': 'TS',
    'Tripura': 'TR', 'Uttar Pradesh': 'UP', 'Uttarakhand': 'UK', 'West Bengal': 'WB',
    'Delhi': 'DL', 'Jammu and Kashmir': 'JK', 'Ladakh': 'LA', 'Chandigarh': 'CH',
    'Dadra and Nagar Haveli': 'DN', 'Daman and Diu': 'DD', 'Lakshadweep': 'LD',
    'Puducherry': 'PY', 'Andaman and Nicobar Islands': 'AN',
  };
  return stateCodeMap[stateName] || stateName.substring(0, 2).toUpperCase();
}

export function getGSTINStateCode(stateName: string): string {
  const gstinStateCodeMap: { [key: string]: string } = {
    'Andhra Pradesh': '37', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
    'Chhattisgarh': '22', 'Goa': '30', 'Gujarat': '24', 'Haryana': '06',
    'Himachal Pradesh': '02', 'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32',
    'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14', 'Meghalaya': '17',
    'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21', 'Punjab': '03',
    'Rajasthan': '08', 'Sikkim': '11', 'Tamil Nadu': '33', 'Telangana': '36',
    'Tripura': '16', 'Uttar Pradesh': '09', 'Uttarakhand': '05', 'West Bengal': '19',
    'Andaman and Nicobar Islands': '35', 'Chandigarh': '04',
    'Dadra and Nagar Haveli': '26', 'Daman and Diu': '25', 'Delhi': '07',
    'Jammu and Kashmir': '01', 'Ladakh': '38', 'Lakshadweep': '31', 'Puducherry': '34',
  };
  return gstinStateCodeMap[stateName] || '00';
}

// ============================================
// Interfaces
// ============================================

export interface BusinessAddress {
  id: string;
  name: string;
  type: 'primary' | 'branch' | 'warehouse';
  doorNumber: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3?: string;
  additionalLines?: string[];
  city: string;
  pincode: string;
  stateName: string;
  stateCode: string;
  manager?: string;
  phone?: string;
  isPrimary: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  backendId?: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Maps a backend location row (snake_case) to frontend BusinessAddress (camelCase).
 * Handles both already-mapped camelCase objects and raw snake_case DB rows.
 */
export function mapLocationToAddress(loc: any): BusinessAddress {
  const isCamelCase = 'addressLine1' in loc || 'isPrimary' in loc;

  if (isCamelCase) {
    return {
      ...loc,
      backendId: loc.backendId || loc.id,
    };
  }

  return {
    id: loc.id,
    backendId: loc.id,
    name: loc.name || '',
    type: loc.type || 'primary',
    doorNumber: loc.door_number || '',
    addressLine1: loc.address_line_1 || '',
    addressLine2: loc.address_line_2 || '',
    addressLine3: loc.address_line_3 || '',
    city: loc.city || '',
    pincode: loc.pincode || '',
    stateName: loc.state || '',
    stateCode: loc.state_code && loc.state_code !== loc.state
      ? loc.state_code
      : getGSTINStateCode(loc.state || ''),
    manager: loc.contact_name || '',
    phone: loc.contact_phone || '',
    isPrimary: loc.is_primary ?? false,
    status: loc.is_deleted ? 'inactive' : 'active',
    createdAt: loc.created_at || new Date().toISOString(),
    updatedAt: loc.updated_at || new Date().toISOString(),
    latitude: loc.latitude != null ? parseFloat(loc.latitude) : null,
    longitude: loc.longitude != null ? parseFloat(loc.longitude) : null,
  };
}

/**
 * Maps an array of backend location rows to frontend BusinessAddress[].
 */
export function mapLocationsToAddresses(locations: any[]): BusinessAddress[] {
  return (locations || []).filter((l: any) => !l.is_deleted).map(mapLocationToAddress);
}

export interface Customer {
  id: string;
  name: string;
  businessName?: string;
  customerType: 'business' | 'individual';
  contactPerson: string;
  mobile: string;
  email?: string;
  address: string;
  gstin?: string;
  avatar: string;
  customerScore: number;
  onTimePayment: number;
  satisfactionRating: number;
  responseTime: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalValue: number;
  averageOrderValue: number;
  returnRate: number;
  lastOrderDate: string | null;
  joinedDate: string;
  status: 'active' | 'inactive' | 'suspended';
  paymentTerms?: string;
  creditLimit?: number;
  categories?: string[];
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  businessName?: string;
  supplierType: 'business' | 'individual';
  contactPerson: string;
  mobile: string;
  email?: string;
  address: string;
  gstin?: string;
  avatar: string;
  supplierScore: number;
  onTimeDelivery: number;
  qualityRating: number;
  responseTime: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalValue: number;
  lastOrderDate: string | null;
  joinedDate: string;
  status: 'active' | 'inactive' | 'suspended';
  paymentTerms: string;
  deliveryTime: string;
  categories: string[];
  productCount: number;
  createdAt: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerType: 'business' | 'individual';
  items: SaleItem[];
  subtotal: number;
  taxAmount: number;
  cessAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'others';
  othersMethod?: string;
  saleDate: string;
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
  cessType?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cessRate?: number;
  cessAmount?: number;
  hsnCode: string;
  batchNumber?: string;
  primaryUnit: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerType: 'business' | 'individual';
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  cessAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: string;
  invoiceDate: string;
  dueDate?: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
  cessType?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cessRate?: number;
  cessAmount?: number;
  hsnCode: string;
  batchNumber?: string;
  primaryUnit: string;
}

export interface Receivable {
  id: string;
  customerId: string;
  customerName: string;
  customerType: 'business' | 'individual';
  businessName?: string;
  gstin?: string;
  mobile: string;
  email?: string;
  address: string;
  totalReceivable: number;
  overdueAmount: number;
  invoiceCount: number;
  oldestInvoiceDate: string;
  daysPastDue: number;
  creditLimit?: number;
  paymentTerms?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  customerAvatar: string;
  status: 'current' | 'overdue' | 'critical';
}

export interface Payable {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierType: 'business' | 'individual';
  businessName?: string;
  gstin?: string;
  mobile: string;
  email?: string;
  address: string;
  totalPayable: number;
  overdueAmount: number;
  billCount: number;
  oldestBillDate: string;
  daysPastDue: number;
  creditLimit?: number;
  paymentTerms?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  supplierAvatar: string;
  status: 'current' | 'overdue' | 'critical';
}

export interface BankAccount {
  id: string;
  backendId?: string;
  bankId: string;
  bankName: string;
  bankShortName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  accountType: 'Savings' | 'Current';
  initialBalance: number;
  balance: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface Staff {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  role: string;
  department?: string;
  address?: string;
  employeeId?: string;
  locationId?: string;
  locationType?: 'branch' | 'warehouse' | 'primary';
  locationName?: string;
  status: 'active' | 'inactive' | 'on_leave';
  joinDate?: string;
  avatar?: string;
  basicSalary?: number;
  allowances?: number;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  permissions?: string[];
  monthlySalesTarget?: number;
  monthlyInvoiceTarget?: number;
  attendance?: { percentage: number; presentDays: number; totalDays: number; lastCheckIn: string };
  performance?: { score: number; salesAmount: number; invoicesProcessed: number; customersServed: number; returnsHandled: number; rating: number };
  targets?: { monthlySalesTarget: number; achievedSales: number; monthlyInvoiceTarget: number; achievedInvoices: number };
  createdAt: string;
  updatedAt: string;
  isIncomplete?: boolean;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  reference: string;
  category: string;
  transactionNumber: string;
  source: 'UPI' | 'Card' | 'Cheque' | 'Cash' | 'Bank Transfer' | 'NEFT' | 'RTGS' | 'IMPS' | 'Other';
  relatedInvoiceId?: string;
  relatedCustomerId?: string;
  relatedSupplierId?: string;
  createdAt: string;
  chequeNumber?: string;
  chequeDate?: string;
  isCleared?: boolean;
  clearanceDate?: string;
}

export interface SignupProgress {
  mobile?: string;
  mobileVerified?: boolean;
  taxIdType?: 'GSTIN' | 'PAN';
  taxIdValue?: string;
  taxIdVerified?: boolean;
  ownerName?: string;
  ownerDob?: string;
  businessName?: string;
  businessType?: string;
  primaryAddressAdded?: boolean;
  addressesCount?: number;
  bankAccountsCount?: number;
  initialCashBalance?: string;
  invoicePrefix?: string;
  invoicePattern?: string;
  startingInvoiceNumber?: string;
  fiscalYear?: string;
  currentStep?: 'mobile' | 'otp' | 'taxId' | 'taxIdOtp' | 'businessDetails' | 'address' | 'banking' | 'finalSetup' | 'summary' | 'complete';
  lastUpdated?: string;
}

export interface UserAccount {
  id: string;
  mobile: string;
  mobileVerified: boolean;
  ownerName: string;
  businessName: string;
  businessType: string;
  taxIdType: 'GSTIN' | 'PAN';
  taxIdValue: string;
  taxIdVerified: boolean;
  ownerDob?: string;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  addresses: BusinessAddress[];
  bankAccounts: BankAccount[];
  initialCashBalance: number;
  invoiceConfig: { prefix: string; pattern: string; startingNumber: string; fiscalYear: string };
}

export interface ChangeLog {
  id: string;
  timestamp: string;
  changeType: 'address_add' | 'address_edit' | 'address_delete' | 'address_primary_change' |
              'bank_add' | 'bank_edit' | 'bank_delete' | 'bank_primary_change' |
              'business_info_update' | 'invoice_config_update' | 'signup_step';
  description: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}

// ============================================
// AsyncStorage keys
// ============================================
const STORAGE_KEYS = {
  ADDRESSES: 'addresses',
  BANK_ACCOUNTS: 'bankAccounts',
  STAFF: 'staff',
  SIGNUP_COMPLETE: 'isSignupComplete',
  SIGNUP_PROGRESS: 'signupProgress',
  CHANGE_LOGS: 'changeLogs',
  USER_ACCOUNTS: 'userAccounts',
} as const;

// Debounce helper to prevent excessive AsyncStorage writes
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 300;

class DataStore {
  private customers: Customer[] = [];
  private suppliers: Supplier[] = [];
  private sales: Sale[] = [];
  private invoices: Invoice[] = [];
  private receivables: Receivable[] = [];
  private payables: Payable[] = [];
  private addresses: BusinessAddress[] = [];
  private bankAccounts: BankAccount[] = [];
  private bankTransactions: BankTransaction[] = [];
  private staff: Staff[] = [];
  private listeners: (() => void)[] = [];
  private isSignupComplete: boolean = false;
  private signupProgress: SignupProgress = {};
  private changeLogs: ChangeLog[] = [];
  private userAccounts: UserAccount[] = [];
  private isSaving = false;
  private pendingSave = false;

  // ============================================
  // Persistence: batched reads/writes
  // ============================================

  async loadData() {
    try {
      const keys = Object.values(STORAGE_KEYS);
      const results = await AsyncStorage.multiGet(keys);

      const map = new Map(results as [string, string | null][]);

      const parse = <T>(key: string, fallback: T): T => {
        const raw = map.get(key);
        if (!raw) return fallback;
        try { return JSON.parse(raw); } catch { return fallback; }
      };

      this.addresses = parse(STORAGE_KEYS.ADDRESSES, []);
      this.bankAccounts = parse(STORAGE_KEYS.BANK_ACCOUNTS, []);
      this.staff = parse(STORAGE_KEYS.STAFF, []);
      this.changeLogs = parse(STORAGE_KEYS.CHANGE_LOGS, []);
      this.userAccounts = parse(STORAGE_KEYS.USER_ACCOUNTS, []);
      this.signupProgress = parse(STORAGE_KEYS.SIGNUP_PROGRESS, {});

      const signupComplete = map.get(STORAGE_KEYS.SIGNUP_COMPLETE);
      this.isSignupComplete = signupComplete === 'true';

      this.notifyListeners();
    } catch (error) {
      console.error('Error loading data from storage:', error);
    }
  }

  async saveData() {
    // Prevent concurrent writes; queue if already saving
    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }

    this.isSaving = true;
    try {
      const pairs: [string, string][] = [
        [STORAGE_KEYS.ADDRESSES, JSON.stringify(this.addresses)],
        [STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify(this.bankAccounts)],
        [STORAGE_KEYS.STAFF, JSON.stringify(this.staff)],
        [STORAGE_KEYS.SIGNUP_COMPLETE, this.isSignupComplete.toString()],
        [STORAGE_KEYS.SIGNUP_PROGRESS, JSON.stringify(this.signupProgress)],
        [STORAGE_KEYS.CHANGE_LOGS, JSON.stringify(this.changeLogs)],
        [STORAGE_KEYS.USER_ACCOUNTS, JSON.stringify(this.userAccounts)],
      ];
      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      console.error('Error saving data to storage:', error);
    } finally {
      this.isSaving = false;
      if (this.pendingSave) {
        this.pendingSave = false;
        this.saveData();
      }
    }
  }

  /** Debounced save - coalesces rapid sequential saves into one */
  private debouncedSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { this.saveData(); }, SAVE_DEBOUNCE_MS);
  }

  // ============================================
  // Customer methods (local cache, backend is source of truth)
  // ============================================

  addCustomer(customer: Customer) {
    this.customers.push(customer);
    this.notifyListeners();
  }

  getCustomers(): Customer[] { return [...this.customers]; }
  getCustomerById(id: string): Customer | undefined { return this.customers.find(c => c.id === id); }

  searchCustomers(query: string): Customer[] {
    const q = query.toLowerCase();
    return this.customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.businessName?.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.mobile.includes(query) ||
      c.gstin?.toLowerCase().includes(q)
    );
  }

  updateCustomer(id: string, updates: Partial<Customer>) {
    const idx = this.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.customers[idx] = { ...this.customers[idx], ...updates };
      this.notifyListeners();
    }
  }

  // ============================================
  // Supplier methods
  // ============================================

  addSupplier(supplier: Supplier) {
    this.suppliers.push(supplier);
    this.notifyListeners();
  }

  getSuppliers(): Supplier[] { return [...this.suppliers]; }
  getSupplierById(id: string): Supplier | undefined { return this.suppliers.find(s => s.id === id); }

  searchSuppliers(query: string): Supplier[] {
    const q = query.toLowerCase();
    return this.suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.businessName?.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.mobile.includes(query) ||
      s.gstin?.toLowerCase().includes(q)
    );
  }

  updateSupplier(id: string, updates: Partial<Supplier>) {
    const idx = this.suppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.suppliers[idx] = { ...this.suppliers[idx], ...updates };
      this.notifyListeners();
    }
  }

  // ============================================
  // Sale / Invoice methods (local cache)
  // ============================================

  addSale(sale: Sale) {
    this.sales.push(sale);

    const invoice: Invoice = {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerType: sale.customerType,
      items: sale.items.map(item => ({
        productId: item.productId, productName: item.productName,
        quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice,
        taxRate: item.taxRate, taxAmount: item.taxAmount,
        cessType: item.cessType, cessRate: item.cessRate, cessAmount: item.cessAmount,
        hsnCode: item.hsnCode, batchNumber: item.batchNumber, primaryUnit: item.primaryUnit,
      })),
      subtotal: sale.subtotal, taxAmount: sale.taxAmount, cessAmount: sale.cessAmount,
      totalAmount: sale.totalAmount, paidAmount: sale.paidAmount, balanceAmount: sale.balanceAmount,
      paymentMethod: sale.paymentMethod, invoiceDate: sale.saleDate,
      status: sale.balanceAmount > 0 ? 'partial' : 'paid', createdAt: sale.createdAt,
    };

    this.invoices.push(invoice);
    this.notifyListeners();
  }

  getSales(): Sale[] { return [...this.sales]; }
  getInvoices(): Invoice[] { return [...this.invoices]; }
  getInvoicesByCustomer(customerId: string): Invoice[] { return this.invoices.filter(i => i.customerId === customerId); }
  getInvoiceById(invoiceId: string): Invoice | undefined { return this.invoices.find(i => i.id === invoiceId); }
  getReceivables(): Receivable[] { return [...this.receivables]; }
  getPayables(): Payable[] { return [...this.payables]; }

  // ============================================
  // Address methods (persisted to AsyncStorage)
  // ============================================

  addAddress(address: BusinessAddress) {
    this.addresses.push(address);
    this.debouncedSave();
    if (address.manager && address.phone) {
      this.createStaffFromAddress(address).catch(() => {});
    }
    this.notifyListeners();
  }

  getAddresses(): BusinessAddress[] { return [...this.addresses]; }
  getAddressById(id: string): BusinessAddress | undefined { return this.addresses.find(a => a.id === id || a.backendId === id); }
  getAddressesByType(type: 'primary' | 'branch' | 'warehouse'): BusinessAddress[] { return this.addresses.filter(a => a.type === type); }
  getPrimaryAddress(): BusinessAddress | undefined { return this.addresses.find(a => a.isPrimary); }
  getAddressCountByType(type: 'primary' | 'branch' | 'warehouse'): number { return this.addresses.filter(a => a.type === type).length; }

  updateAddress(id: string, updates: Partial<BusinessAddress>) {
    const idx = this.addresses.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.addresses[idx] = { ...this.addresses[idx], ...updates, updatedAt: new Date().toISOString() };
      this.debouncedSave();
      const addr = this.addresses[idx];
      if (addr.manager && addr.phone) {
        this.createStaffFromAddress(addr).catch(() => {});
      }
      this.notifyListeners();
    }
  }

  deleteAddress(id: string) {
    const idx = this.addresses.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.addresses.splice(idx, 1);
      this.debouncedSave();
      this.notifyListeners();
    }
  }

  setPrimaryAddress(id: string) {
    this.addresses.forEach(a => { a.isPrimary = false; });
    const addr = this.addresses.find(a => a.id === id);
    if (addr) {
      addr.isPrimary = true;
      this.debouncedSave();
      this.notifyListeners();
    }
  }

  // ============================================
  // Bank Account methods (persisted to AsyncStorage)
  // ============================================

  addBankAccount(bankAccount: BankAccount) {
    this.bankAccounts.push(bankAccount);
    this.debouncedSave();
    this.notifyListeners();
  }

  getBankAccounts(): BankAccount[] { return [...this.bankAccounts]; }
  getBankAccountById(id: string): BankAccount | undefined { return this.bankAccounts.find(a => a.id === id); }
  getPrimaryBankAccount(): BankAccount | undefined { return this.bankAccounts.find(a => a.isPrimary); }
  getBankAccountCount(): number { return this.bankAccounts.length; }

  updateBankAccount(id: string, updates: Partial<BankAccount>) {
    const idx = this.bankAccounts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.bankAccounts[idx] = { ...this.bankAccounts[idx], ...updates };
      this.debouncedSave();
      this.notifyListeners();
    }
  }

  deleteBankAccount(id: string) {
    const idx = this.bankAccounts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.bankAccounts.splice(idx, 1);
      this.debouncedSave();
      this.notifyListeners();
    }
  }

  setPrimaryBankAccount(id: string) {
    this.bankAccounts.forEach(a => { a.isPrimary = false; });
    const account = this.bankAccounts.find(a => a.id === id);
    if (account) {
      account.isPrimary = true;
      this.debouncedSave();
      this.notifyListeners();
    }
  }

  // ============================================
  // Staff methods (persisted to AsyncStorage)
  // ============================================

  addStaff(staff: Staff) {
    this.staff.push(staff);
    this.debouncedSave();
    this.notifyListeners();
  }

  getStaff(): Staff[] { return [...this.staff]; }
  getStaffById(id: string): Staff | undefined { return this.staff.find(s => s.id === id); }
  getStaffByMobile(mobile: string): Staff | undefined { return this.staff.find(s => s.mobile === mobile); }
  getStaffByLocation(locationId: string): Staff[] { return this.staff.filter(s => s.locationId === locationId); }

  updateStaff(id: string, updates: Partial<Staff>) {
    const idx = this.staff.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.staff[idx] = { ...this.staff[idx], ...updates, updatedAt: new Date().toISOString() };
      this.debouncedSave();
      this.notifyListeners();
    }
  }

  deleteStaff(id: string) {
    const idx = this.staff.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.staff.splice(idx, 1);
      this.debouncedSave();
      this.notifyListeners();
    }
  }

  extractStaffFromLocations() {
    const allAddresses = this.getAddresses();
    const existingMobiles = new Set(this.staff.map(s => s.mobile));
    const newStaff: Staff[] = [];

    allAddresses.forEach(address => {
      if (address.manager && address.phone) {
        const mobile = address.phone.replace(/\D/g, '').slice(0, 10);
        const existing = this.staff.find(s => s.mobile === mobile);

        if (existing) {
          if (existing.locationId !== address.id) {
            this.updateStaff(existing.id, { locationId: address.id, locationType: address.type, locationName: address.name });
          }
          return;
        }

        let role = 'Store Manager';
        if (address.type === 'branch') role = 'Branch Manager';
        else if (address.type === 'warehouse') role = 'Warehouse Manager';

        const s: Staff = {
          id: `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: address.manager, mobile, role,
          locationId: address.id, locationType: address.type, locationName: address.name,
          status: 'active', isIncomplete: true,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        newStaff.push(s);
        existingMobiles.add(mobile);
      }
    });

    newStaff.forEach(s => this.addStaff(s));
    return newStaff;
  }

  async createStaffFromAddress(address: BusinessAddress) {
    if (!address.manager || !address.phone) return null;
    const mobile = address.phone.replace(/\D/g, '').slice(0, 10);
    if (mobile.length !== 10) return null;

    const existing = this.getStaffByMobile(mobile);
    let role = 'Store Manager';
    if (address.type === 'branch') role = 'Branch Manager';
    else if (address.type === 'warehouse') role = 'Warehouse Manager';

    if (existing) {
      this.updateStaff(existing.id, {
        name: address.manager, role,
        locationId: address.id, locationType: address.type, locationName: address.name,
      });
      return existing.id;
    }

    const s: Staff = {
      id: `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: address.manager, mobile, role,
      locationId: address.id, locationType: address.type, locationName: address.name,
      status: 'active', isIncomplete: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.addStaff(s);
    return s.id;
  }

  // ============================================
  // Bank Transaction methods
  // ============================================

  addBankTransaction(transaction: BankTransaction) {
    this.bankTransactions.push(transaction);
    const account = this.getBankAccountById(transaction.bankAccountId);
    if (account) {
      account.balance += transaction.type === 'credit' ? transaction.amount : -transaction.amount;
    }
    this.notifyListeners();
  }

  getBankTransactions(bankAccountId?: string): BankTransaction[] {
    return bankAccountId ? this.bankTransactions.filter(t => t.bankAccountId === bankAccountId) : [...this.bankTransactions];
  }

  getBankTransactionById(id: string): BankTransaction | undefined { return this.bankTransactions.find(t => t.id === id); }

  getBankTransactionsByType(bankAccountId: string, type: 'credit' | 'debit'): BankTransaction[] {
    return this.bankTransactions.filter(t => t.bankAccountId === bankAccountId && t.type === type);
  }

  getBankAccountBalance(bankAccountId: string): number { return this.getBankAccountById(bankAccountId)?.balance || 0; }

  getTotalIncome(bankAccountId?: string): number {
    const txns = bankAccountId ? this.getBankTransactions(bankAccountId) : this.bankTransactions;
    return txns.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  }

  getTotalExpense(bankAccountId?: string): number {
    const txns = bankAccountId ? this.getBankTransactions(bankAccountId) : this.bankTransactions;
    return txns.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  }

  clearCheque(transactionId: string, clearanceDate: string): boolean {
    const t = this.bankTransactions.find(t => t.id === transactionId);
    if (t && t.source === 'Cheque' && !t.isCleared) {
      t.isCleared = true;
      t.clearanceDate = clearanceDate;
      const account = this.getBankAccountById(t.bankAccountId);
      if (account) account.balance += t.type === 'credit' ? t.amount : -t.amount;
      this.notifyListeners();
      return true;
    }
    return false;
  }

  bounceCheque(transactionId: string): boolean {
    const idx = this.bankTransactions.findIndex(t => t.id === transactionId);
    if (idx !== -1 && this.bankTransactions[idx].source === 'Cheque' && !this.bankTransactions[idx].isCleared) {
      const t = this.bankTransactions[idx];
      this.bankTransactions.splice(idx, 1);
      const account = this.getBankAccountById(t.bankAccountId);
      if (account) account.balance += t.type === 'credit' ? -t.amount : t.amount;
      this.notifyListeners();
      return true;
    }
    return false;
  }

  getUnclearedCheques(bankAccountId: string): BankTransaction[] {
    return this.bankTransactions.filter(t => t.bankAccountId === bankAccountId && t.source === 'Cheque' && !t.isCleared);
  }

  // ============================================
  // Product record management
  // ============================================

  deleteProductRecords(productId: string) {
    const origSales = this.sales.length;
    const origInv = this.invoices.length;
    this.sales = this.sales.filter(s => !s.items.some(i => i.productId === productId));
    this.invoices = this.invoices.filter(inv => !inv.items.some(i => i.productId === productId));
    this.receivables = this.receivables.filter(r => r.totalReceivable > 0);
    this.notifyListeners();
    return { sales: origSales - this.sales.length, invoices: origInv - this.invoices.length, receivablesUpdated: 0 };
  }

  getProductRecords(productId: string) {
    const relatedSales = this.sales.filter(s => s.items.some(i => i.productId === productId));
    const relatedInvoices = this.invoices.filter(inv => inv.items.some(i => i.productId === productId));
    const affected = new Set<string>();
    relatedSales.forEach(s => affected.add(s.customerId));
    relatedInvoices.forEach(inv => affected.add(inv.customerId));
    const relatedReceivables = this.receivables.filter(r => affected.has(r.customerId));
    return {
      sales: relatedSales, invoices: relatedInvoices, receivables: relatedReceivables,
      totalSales: relatedSales.length, totalInvoices: relatedInvoices.length,
      totalReceivables: relatedReceivables.length,
      totalAmount: relatedSales.reduce((sum, s) => sum + s.totalAmount, 0),
    };
  }

  // ============================================
  // Counts
  // ============================================

  getCustomerCount(): number { return this.customers.length; }
  getSupplierCount(): number { return this.suppliers.length; }
  getSaleCount(): number { return this.sales.length; }
  getInvoiceCount(): number { return this.invoices.length; }

  // ============================================
  // Signup Progress
  // ============================================

  updateSignupProgress(updates: Partial<SignupProgress>) {
    this.signupProgress = { ...this.signupProgress, ...updates, lastUpdated: new Date().toISOString() };
    this.debouncedSave();
  }

  getSignupProgress(): SignupProgress { return this.signupProgress; }

  async getSignupProgressByMobile(mobile: string): Promise<SignupProgress | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SIGNUP_PROGRESS);
      if (raw) {
        const progress = JSON.parse(raw);
        if (progress.mobile === mobile) return progress;
      }
      return null;
    } catch { return null; }
  }

  clearSignupProgress() {
    this.signupProgress = {};
    this.debouncedSave();
  }

  // ============================================
  // Clear all data
  // ============================================

  async clearAllDataForTesting() {
    this.addresses = [];
    this.bankAccounts = [];
    this.staff = [];
    this.customers = [];
    this.invoices = [];
    this.receivables = [];
    this.payables = [];
    this.bankTransactions = [];
    this.changeLogs = [];
    this.userAccounts = [];
    this.sales = [];
    this.suppliers = [];
    this.signupProgress = {};
    this.isSignupComplete = false;

    try {
      await AsyncStorage.multiRemove([
        ...Object.values(STORAGE_KEYS),
        'appSubscription', 'subscription_data', 'cartItems', 'colorScheme',
      ]);
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
    this.notifyListeners();
  }

  // ============================================
  // User Account methods
  // ============================================

  createUserAccount(): UserAccount {
    const progress = this.signupProgress;
    const now = new Date().toISOString();
    const userAccount: UserAccount = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mobile: progress.mobile || '',
      mobileVerified: progress.mobileVerified || false,
      ownerName: progress.ownerName || '',
      businessName: progress.businessName || '',
      businessType: progress.businessType || '',
      taxIdType: progress.taxIdType || 'PAN',
      taxIdValue: progress.taxIdValue || '',
      taxIdVerified: progress.taxIdVerified || false,
      ownerDob: progress.ownerDob,
      createdAt: now, lastLoginAt: now, isActive: true,
      addresses: [...this.addresses],
      bankAccounts: [...this.bankAccounts],
      initialCashBalance: parseFloat(progress.initialCashBalance || '0'),
      invoiceConfig: {
        prefix: progress.invoicePrefix || 'INV',
        pattern: progress.invoicePattern || '',
        startingNumber: progress.startingInvoiceNumber || '1',
        fiscalYear: progress.fiscalYear || 'APR-MAR',
      },
    };
    this.userAccounts.push(userAccount);
    this.saveData();
    return userAccount;
  }

  getUserAccountByMobile(mobile: string): UserAccount | null {
    return this.userAccounts.find(acc => acc.mobile === mobile && acc.isActive) || null;
  }

  updateUserLastLogin(mobile: string) {
    const account = this.userAccounts.find(acc => acc.mobile === mobile && acc.isActive);
    if (account) {
      account.lastLoginAt = new Date().toISOString();
      this.debouncedSave();
    }
  }

  getAllUserAccounts(): UserAccount[] { return this.userAccounts.filter(acc => acc.isActive); }

  deactivateUserAccount(mobile: string) {
    const account = this.userAccounts.find(acc => acc.mobile === mobile);
    if (account) {
      account.isActive = false;
      this.debouncedSave();
    }
  }

  // ============================================
  // Change Log
  // ============================================

  logChange(changeType: ChangeLog['changeType'], description: string, oldValue?: any, newValue?: any, metadata?: any) {
    this.changeLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      changeType, description, oldValue, newValue, metadata,
    });
    this.debouncedSave();
  }

  getChangeLogs(): ChangeLog[] { return this.changeLogs; }
  getChangeLogsByType(changeType: ChangeLog['changeType']): ChangeLog[] { return this.changeLogs.filter(l => l.changeType === changeType); }
  clearChangeLogs() { this.changeLogs = []; this.debouncedSave(); }

  // ============================================
  // Signup Summary
  // ============================================

  getSignupSummary() {
    const progress = this.signupProgress;
    const primaryAddress = this.addresses.find(a => a.isPrimary);
    const branches = this.addresses.filter(a => a.type === 'branch');
    const warehouses = this.addresses.filter(a => a.type === 'warehouse');
    const primaryBank = this.bankAccounts.find(b => b.isPrimary);
    const secondaryBanks = this.bankAccounts.filter(b => !b.isPrimary);

    return {
      userName: progress.ownerName, mobileNumber: progress.mobile,
      businessName: progress.businessName, businessType: progress.businessType,
      taxIdType: progress.taxIdType, taxIdValue: progress.taxIdValue, ownerDob: progress.ownerDob,
      primaryAddress: primaryAddress ? {
        id: primaryAddress.id, name: primaryAddress.name, doorNumber: primaryAddress.doorNumber,
        addressLine1: primaryAddress.addressLine1, addressLine2: primaryAddress.addressLine2,
        city: primaryAddress.city, state: primaryAddress.stateName, stateCode: primaryAddress.stateCode,
        pincode: primaryAddress.pincode, type: primaryAddress.type,
      } : null,
      branchAddresses: branches.map(a => ({
        id: a.id, name: a.name, doorNumber: a.doorNumber, addressLine1: a.addressLine1,
        addressLine2: a.addressLine2, city: a.city, state: a.stateName, stateCode: a.stateCode,
        pincode: a.pincode, manager: a.manager, phone: a.phone,
      })),
      warehouseAddresses: warehouses.map(a => ({
        id: a.id, name: a.name, doorNumber: a.doorNumber, addressLine1: a.addressLine1,
        addressLine2: a.addressLine2, city: a.city, state: a.stateName, stateCode: a.stateCode,
        pincode: a.pincode, manager: a.manager, phone: a.phone,
      })),
      totalAddresses: this.addresses.length,
      primaryBankAccount: primaryBank ? {
        id: primaryBank.id, bankName: primaryBank.bankName, accountHolderName: primaryBank.accountHolderName,
        accountNumber: primaryBank.accountNumber, ifscCode: primaryBank.ifscCode,
        initialBalance: primaryBank.initialBalance, upiId: primaryBank.upiId,
      } : null,
      additionalBankAccounts: secondaryBanks.map(b => ({
        id: b.id, bankName: b.bankName, accountHolderName: b.accountHolderName,
        accountNumber: b.accountNumber, ifscCode: b.ifscCode,
        initialBalance: b.initialBalance, upiId: b.upiId,
      })),
      totalBankAccounts: this.bankAccounts.length,
      initialCashBalance: progress.initialCashBalance,
      invoicePrefix: progress.invoicePrefix, invoicePattern: progress.invoicePattern,
      startingInvoiceNumber: progress.startingInvoiceNumber, fiscalYear: progress.fiscalYear,
      currentStep: progress.currentStep, lastUpdated: progress.lastUpdated,
      isComplete: this.isSignupComplete,
    };
  }

  // ============================================
  // Signup completion
  // ============================================

  setSignupComplete(complete: boolean) {
    this.isSignupComplete = complete;
    AsyncStorage.setItem(STORAGE_KEYS.SIGNUP_COMPLETE, complete.toString()).catch(() => {});
    this.notifyListeners();
  }

  async getSignupComplete(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SIGNUP_COMPLETE);
      if (stored !== null) this.isSignupComplete = stored === 'true';
      return this.isSignupComplete;
    } catch { return this.isSignupComplete; }
  }

  // ============================================
  // Observer pattern
  // ============================================

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx > -1) this.listeners.splice(idx, 1);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn());
  }

  async clearAll() {
    await this.clearAllDataForTesting();
  }

  clearAddresses() {
    this.addresses = [];
    this.debouncedSave();
    this.notifyListeners();
  }
}

export const dataStore = new DataStore();
