// Comprehensive data store for the ERP app
// Manages customers, suppliers, sales, invoices, and inventory

import AsyncStorage from '@react-native-async-storage/async-storage';

// Title case conversion utility
// Converts "EXANITE TECHNOLOGIES PRIVATE LIMITED" to "Exanite Technologies Private Limited"
export function toTitleCase(str: string | undefined | null): string {
  if (!str) return '';
  
  // Words that should remain lowercase (unless at start of string)
  const minorWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'];
  
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word, or if not a minor word
      if (index === 0 || !minorWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

// State code mapping function
export function getStateCode(stateName: string): string {
  const stateCodeMap: { [key: string]: string } = {
    'Andhra Pradesh': 'AP',
    'Arunachal Pradesh': 'AR',
    'Assam': 'AS',
    'Bihar': 'BR',
    'Chhattisgarh': 'CG',
    'Goa': 'GA',
    'Gujarat': 'GJ',
    'Haryana': 'HR',
    'Himachal Pradesh': 'HP',
    'Jharkhand': 'JH',
    'Karnataka': 'KA',
    'Kerala': 'KL',
    'Madhya Pradesh': 'MP',
    'Maharashtra': 'MH',
    'Manipur': 'MN',
    'Meghalaya': 'ML',
    'Mizoram': 'MZ',
    'Nagaland': 'NL',
    'Odisha': 'OD',
    'Punjab': 'PB',
    'Rajasthan': 'RJ',
    'Sikkim': 'SK',
    'Tamil Nadu': 'TN',
    'Telangana': 'TS',
    'Tripura': 'TR',
    'Uttar Pradesh': 'UP',
    'Uttarakhand': 'UK',
    'West Bengal': 'WB',
    'Delhi': 'DL',
    'Jammu and Kashmir': 'JK',
    'Ladakh': 'LA',
    'Chandigarh': 'CH',
    'Dadra and Nagar Haveli': 'DN',
    'Daman and Diu': 'DD',
    'Lakshadweep': 'LD',
    'Puducherry': 'PY',
    'Andaman and Nicobar Islands': 'AN'
  };
  
  return stateCodeMap[stateName] || stateName.substring(0, 2).toUpperCase();
}

// GSTIN State code mapping function
export function getGSTINStateCode(stateName: string): string {
  const gstinStateCodeMap: { [key: string]: string } = {
    'Andhra Pradesh': '37',
    'Arunachal Pradesh': '12',
    'Assam': '18',
    'Bihar': '10',
    'Chhattisgarh': '22',
    'Goa': '30',
    'Gujarat': '24',
    'Haryana': '06',
    'Himachal Pradesh': '02',
    'Jharkhand': '20',
    'Karnataka': '29',
    'Kerala': '32',
    'Madhya Pradesh': '23',
    'Maharashtra': '27',
    'Manipur': '14',
    'Meghalaya': '17',
    'Mizoram': '15',
    'Nagaland': '13',
    'Odisha': '21',
    'Punjab': '03',
    'Rajasthan': '08',
    'Sikkim': '11',
    'Tamil Nadu': '33',
    'Telangana': '36',
    'Tripura': '16',
    'Uttar Pradesh': '09',
    'Uttarakhand': '05',
    'West Bengal': '19',
    'Andaman and Nicobar Islands': '35',
    'Chandigarh': '04',
    'Dadra and Nagar Haveli': '26',
    'Daman and Diu': '25',
    'Delhi': '07',
    'Jammu and Kashmir': '01',
    'Ladakh': '38',
    'Lakshadweep': '31',
    'Puducherry': '34'
  };
  
  return gstinStateCodeMap[stateName] || '00';
}

// Business Address interface
export interface BusinessAddress {
  id: string;
  name: string;
  type: 'primary' | 'branch' | 'warehouse';
  doorNumber: string;
  addressLine1: string;
  addressLine2: string;
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
  // Cheque specific fields
  chequeNumber?: string;
  chequeDate?: string;
  isCleared?: boolean;
  clearanceDate?: string;
}

// Signup Progress Tracking
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

// User Account for Login
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
  // Business data
  addresses: BusinessAddress[];
  bankAccounts: BankAccount[];
  initialCashBalance: number;
  invoiceConfig: {
    prefix: string;
    pattern: string;
    startingNumber: string;
    fiscalYear: string;
  };
}

// Change Log
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

class DataStore {
  private customers: Customer[] = [
    // Mock customers for demonstration
    {
      id: 'cust_001',
      name: 'ABC Electronics',
      businessName: 'ABC Electronics Pvt Ltd',
      customerType: 'business',
      contactPerson: 'John Doe',
      mobile: '+91-9876543210',
      email: 'contact@abcelectronics.com',
      address: 'Plot 123, Industrial Area, New Delhi, 110001',
      gstin: '07AABCU9603R1ZX',
      avatar: '🏢',
      customerScore: 85,
      onTimePayment: 95,
      satisfactionRating: 4.5,
      responseTime: 2,
      totalOrders: 25,
      completedOrders: 24,
      pendingOrders: 1,
      cancelledOrders: 0,
      returnedOrders: 0,
      totalValue: 2500000,
      averageOrderValue: 100000,
      returnRate: 0,
      lastOrderDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      joinedDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      paymentTerms: 'Net 30',
      creditLimit: 500000,
      categories: ['Electronics', 'Hardware'],
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'cust_002',
      name: 'XYZ Solutions',
      businessName: 'XYZ Solutions India Ltd',
      customerType: 'business',
      contactPerson: 'Jane Smith',
      mobile: '+91-9876543211',
      email: 'info@xyzsolutions.com',
      address: 'Tower B, Tech Park, Bangalore, 560001',
      gstin: '29AABCU9603R1ZY',
      avatar: '💻',
      customerScore: 92,
      onTimePayment: 98,
      satisfactionRating: 4.8,
      responseTime: 1,
      totalOrders: 15,
      completedOrders: 15,
      pendingOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      totalValue: 1200000,
      averageOrderValue: 80000,
      returnRate: 0,
      lastOrderDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      joinedDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      paymentTerms: 'Net 15',
      creditLimit: 300000,
      categories: ['Software', 'Services'],
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'cust_003',
      name: 'Tech Innovators',
      businessName: 'Tech Innovators Pvt Ltd',
      customerType: 'business',
      contactPerson: 'Mike Johnson',
      mobile: '+91-9876543212',
      email: 'contact@techinnovators.com',
      address: 'Floor 5, Business Center, Mumbai, 400001',
      gstin: '27AABCU9603R1ZZ',
      avatar: '🚀',
      customerScore: 78,
      onTimePayment: 85,
      satisfactionRating: 4.2,
      responseTime: 3,
      totalOrders: 8,
      completedOrders: 7,
      pendingOrders: 1,
      cancelledOrders: 0,
      returnedOrders: 0,
      totalValue: 600000,
      averageOrderValue: 75000,
      returnRate: 0,
      lastOrderDate: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(),
      joinedDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      paymentTerms: 'Net 45',
      creditLimit: 200000,
      categories: ['Technology', 'Innovation'],
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  private suppliers: Supplier[] = [];
  private sales: Sale[] = [];
  private invoices: Invoice[] = [
    // Mock invoices for demonstration
    {
      id: 'INV_001',
      invoiceNumber: 'INV-2024-001',
      customerId: 'cust_001',
      customerName: 'ABC Electronics',
      customerType: 'business',
      items: [
        {
          productId: 'prod_001',
          productName: 'Laptop',
          quantity: 2,
          unitPrice: 45000,
          totalPrice: 90000,
          taxRate: 18,
          taxAmount: 16200,
          hsnCode: '8471',
          primaryUnit: 'pieces'
        }
      ],
      subtotal: 90000,
      taxAmount: 16200,
      cessAmount: 0,
      totalAmount: 106200,
      paidAmount: 106200,
      balanceAmount: 0,
      paymentMethod: 'UPI',
      invoiceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'paid',
      notes: 'Payment received via UPI',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'INV_002',
      invoiceNumber: 'INV-2024-002',
      customerId: 'cust_002',
      customerName: 'XYZ Solutions',
      customerType: 'business',
      items: [
        {
          productId: 'prod_002',
          productName: 'Software License',
          quantity: 5,
          unitPrice: 12000,
          totalPrice: 60000,
          taxRate: 18,
          taxAmount: 10800,
          hsnCode: '998314',
          primaryUnit: 'licenses'
        }
      ],
      subtotal: 60000,
      taxAmount: 10800,
      cessAmount: 0,
      totalAmount: 70800,
      paidAmount: 70800,
      balanceAmount: 0,
      paymentMethod: 'Bank Transfer',
      invoiceDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'paid',
      notes: 'Payment received via bank transfer',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'INV_003',
      invoiceNumber: 'INV-2024-003',
      customerId: 'cust_003',
      customerName: 'Tech Innovators',
      customerType: 'business',
      items: [
        {
          productId: 'prod_003',
          productName: 'Cloud Services',
          quantity: 1,
          unitPrice: 25000,
          totalPrice: 25000,
          taxRate: 18,
          taxAmount: 4500,
          hsnCode: '998314',
          primaryUnit: 'subscription'
        }
      ],
      subtotal: 25000,
      taxAmount: 4500,
      cessAmount: 0,
      totalAmount: 29500,
      paidAmount: 0,
      balanceAmount: 29500,
      paymentMethod: 'Cheque',
      invoiceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'unpaid',
      notes: 'Payment pending via cheque',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  private receivables: Receivable[] = [];
  private payables: Payable[] = [];
  private addresses: BusinessAddress[] = [];
  private bankAccounts: BankAccount[] = [];
  private bankTransactions: BankTransaction[] = [];
  private listeners: (() => void)[] = [];
  private isSignupComplete: boolean = false;
  private signupProgress: SignupProgress = {};
  private changeLogs: ChangeLog[] = [];
  private userAccounts: UserAccount[] = [];

  constructor() {
    // Data will be loaded manually in _layout.tsx after clearing
    // this.loadData(); // Removed automatic loading
  }

  // Persistence methods
  async loadData() {
    try {
      console.log('🔄 Loading data from AsyncStorage...');
      
      // Debug AsyncStorage contents
      await this.debugAsyncStorage();
      
      const addressesData = await AsyncStorage.getItem('addresses');
      if (addressesData) {
        this.addresses = JSON.parse(addressesData);
        console.log('📥 Loaded addresses:', this.addresses.length);
      } else {
        console.log('📭 No addresses found in storage');
      }
      
      const bankAccountsData = await AsyncStorage.getItem('bankAccounts');
      if (bankAccountsData) {
        this.bankAccounts = JSON.parse(bankAccountsData);
        console.log('📥 Loaded bank accounts:', this.bankAccounts.length);
      } else {
        console.log('📭 No bank accounts found in storage');
      }
      
      const signupCompleteData = await AsyncStorage.getItem('isSignupComplete');
      if (signupCompleteData) {
        this.isSignupComplete = signupCompleteData === 'true';
        console.log('📥 Loaded signup complete status:', this.isSignupComplete);
      }
      
      const signupProgressData = await AsyncStorage.getItem('signupProgress');
      if (signupProgressData) {
        this.signupProgress = JSON.parse(signupProgressData);
        console.log('📥 Loaded signup progress:', this.signupProgress);
      } else {
        console.log('📭 No signup progress found in storage');
      }
      
      const changeLogsData = await AsyncStorage.getItem('changeLogs');
      if (changeLogsData) {
        this.changeLogs = JSON.parse(changeLogsData);
        console.log('📥 Loaded change logs:', this.changeLogs.length);
      } else {
        console.log('📭 No change logs found in storage');
      }
      
      const userAccountsData = await AsyncStorage.getItem('userAccounts');
      console.log('🔍 Raw userAccountsData from AsyncStorage:', userAccountsData);
      if (userAccountsData) {
        try {
          this.userAccounts = JSON.parse(userAccountsData);
          console.log('📥 Loaded user accounts:', this.userAccounts.length);
          console.log('📋 User account details:', this.userAccounts.map(acc => ({
            id: acc.id,
            mobile: acc.mobile,
            businessName: acc.businessName,
            isActive: acc.isActive
          })));
        } catch (parseError) {
          console.error('❌ Error parsing user accounts data:', parseError);
          console.log('Raw data that failed to parse:', userAccountsData);
          this.userAccounts = [];
        }
      } else {
        console.log('📭 No user accounts found in storage');
      }
      
      console.log('Data loaded from storage:', {
        addresses: this.addresses.length,
        bankAccounts: this.bankAccounts.length,
        isSignupComplete: this.isSignupComplete,
        signupProgress: this.signupProgress.currentStep || 'none',
        changeLogs: this.changeLogs.length,
        userAccounts: this.userAccounts.length
      });
      
      // Notify listeners after loading data
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading data from storage:', error);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem('addresses', JSON.stringify(this.addresses));
      await AsyncStorage.setItem('bankAccounts', JSON.stringify(this.bankAccounts));
      await AsyncStorage.setItem('isSignupComplete', this.isSignupComplete.toString());
      await AsyncStorage.setItem('signupProgress', JSON.stringify(this.signupProgress));
      await AsyncStorage.setItem('changeLogs', JSON.stringify(this.changeLogs));
      await AsyncStorage.setItem('userAccounts', JSON.stringify(this.userAccounts));
      console.log('Data saved to storage');
      console.log('💾 User accounts saved:', this.userAccounts.length);
      console.log('💾 User accounts data:', this.userAccounts.map(acc => ({ id: acc.id, mobile: acc.mobile, isActive: acc.isActive })));
    } catch (error) {
      console.error('Error saving data to storage:', error);
    }
  }

  // Customer methods
  addCustomer(customer: Customer) {
    this.customers.push(customer);
    console.log('=== CUSTOMER ADDED TO STORE ===');
    console.log('Customer ID:', customer.id);
    console.log('Customer Name:', customer.name);
    console.log('Customer Type:', customer.customerType);
    console.log('Mobile:', customer.mobile);
    console.log('Total customers in store:', this.customers.length);
    console.log('Added at:', new Date().toISOString());
    console.log('================================');
    this.notifyListeners();
  }

  getCustomers(): Customer[] {
    return [...this.customers];
  }

  getCustomerById(id: string): Customer | undefined {
    return this.customers.find(customer => customer.id === id);
  }

  searchCustomers(query: string): Customer[] {
    const lowercaseQuery = query.toLowerCase();
    return this.customers.filter(customer =>
      customer.name.toLowerCase().includes(lowercaseQuery) ||
      customer.businessName?.toLowerCase().includes(lowercaseQuery) ||
      customer.contactPerson.toLowerCase().includes(lowercaseQuery) ||
      customer.mobile.includes(query) ||
      customer.gstin?.toLowerCase().includes(lowercaseQuery)
    );
  }

  updateCustomer(id: string, updates: Partial<Customer>) {
    const index = this.customers.findIndex(customer => customer.id === id);
    if (index !== -1) {
      this.customers[index] = { ...this.customers[index], ...updates };
      this.notifyListeners();
    }
  }

  // Supplier methods
  addSupplier(supplier: Supplier) {
    this.suppliers.push(supplier);
    console.log('=== SUPPLIER ADDED TO STORE ===');
    console.log('Supplier ID:', supplier.id);
    console.log('Supplier Name:', supplier.name);
    console.log('Business Name:', supplier.businessName);
    console.log('Contact Person:', supplier.contactPerson);
    console.log('Mobile:', supplier.mobile);
    console.log('Total suppliers in store:', this.suppliers.length);
    console.log('Added at:', new Date().toISOString());
    console.log('================================');
    this.notifyListeners();
  }

  getSuppliers(): Supplier[] {
    return [...this.suppliers];
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.suppliers.find(supplier => supplier.id === id);
  }

  searchSuppliers(query: string): Supplier[] {
    const lowercaseQuery = query.toLowerCase();
    return this.suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(lowercaseQuery) ||
      supplier.businessName?.toLowerCase().includes(lowercaseQuery) ||
      supplier.contactPerson.toLowerCase().includes(lowercaseQuery) ||
      supplier.mobile.includes(query) ||
      supplier.gstin?.toLowerCase().includes(lowercaseQuery)
    );
  }

  updateSupplier(id: string, updates: Partial<Supplier>) {
    const index = this.suppliers.findIndex(supplier => supplier.id === id);
    if (index !== -1) {
      this.suppliers[index] = { ...this.suppliers[index], ...updates };
      this.notifyListeners();
    }
  }

  // Sale methods
  addSale(sale: Sale) {
    this.sales.push(sale);
    
    // Create invoice from sale
    const invoice: Invoice = {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerType: sale.customerType,
      items: sale.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        cessType: item.cessType,
        cessRate: item.cessRate,
        cessAmount: item.cessAmount,
        hsnCode: item.hsnCode,
        batchNumber: item.batchNumber,
        primaryUnit: item.primaryUnit,
      })),
      subtotal: sale.subtotal,
      taxAmount: sale.taxAmount,
      cessAmount: sale.cessAmount,
      totalAmount: sale.totalAmount,
      paidAmount: sale.paidAmount,
      balanceAmount: sale.balanceAmount,
      paymentMethod: sale.paymentMethod,
      invoiceDate: sale.saleDate,
      status: sale.balanceAmount > 0 ? 'partial' : 'paid',
      createdAt: sale.createdAt,
    };
    
    this.invoices.push(invoice);
    
    // Update customer stats
    this.updateCustomerStats(sale.customerId, sale);
    
    // Update receivables if there's a balance
    if (sale.balanceAmount > 0) {
      this.updateReceivables(sale);
    }
    
    console.log('=== SALE ADDED TO STORE ===');
    console.log('Sale ID:', sale.id);
    console.log('Invoice Number:', sale.invoiceNumber);
    console.log('Customer:', sale.customerName);
    console.log('Total Amount:', sale.totalAmount);
    console.log('Paid Amount:', sale.paidAmount);
    console.log('Balance Amount:', sale.balanceAmount);
    console.log('Total sales in store:', this.sales.length);
    console.log('Total invoices in store:', this.invoices.length);
    console.log('Added at:', new Date().toISOString());
    console.log('================================');
    this.notifyListeners();
  }

  getSales(): Sale[] {
    return [...this.sales];
  }

  getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  getInvoicesByCustomer(customerId: string): Invoice[] {
    return this.invoices.filter(invoice => invoice.customerId === customerId);
  }

  getInvoiceById(invoiceId: string): Invoice | undefined {
    return this.invoices.find(invoice => invoice.id === invoiceId);
  }

  // Receivables methods
  getReceivables(): Receivable[] {
    return [...this.receivables];
  }

  private updateCustomerStats(customerId: string, sale: Sale) {
    const customer = this.getCustomerById(customerId);
    if (customer) {
      const updatedCustomer = { ...customer };
      
      // Update order counts
      updatedCustomer.totalOrders += 1;
      updatedCustomer.completedOrders += 1;
      
      // Update total value
      updatedCustomer.totalValue += sale.totalAmount;
      updatedCustomer.averageOrderValue = updatedCustomer.totalValue / updatedCustomer.totalOrders;
      
      // Update last order date
      updatedCustomer.lastOrderDate = sale.saleDate;
      
      this.updateCustomer(customerId, updatedCustomer);
    }
  }

  private updateReceivables(sale: Sale) {
    const customer = this.getCustomerById(sale.customerId);
    if (!customer) return;

    const existingReceivable = this.receivables.find(r => r.customerId === sale.customerId);
    
    if (existingReceivable) {
      // Update existing receivable
      existingReceivable.totalReceivable += sale.balanceAmount;
      existingReceivable.invoiceCount += 1;
      
      if (sale.balanceAmount > 0) {
        existingReceivable.overdueAmount += sale.balanceAmount;
        existingReceivable.status = existingReceivable.overdueAmount > 0 ? 'overdue' : 'current';
      }
    } else {
      // Create new receivable
      const receivable: Receivable = {
        id: `REC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId: sale.customerId,
        customerName: customer.name,
        customerType: customer.customerType,
        businessName: customer.businessName,
        gstin: customer.gstin,
        mobile: customer.mobile,
        email: customer.email,
        address: customer.address,
        totalReceivable: sale.balanceAmount,
        overdueAmount: sale.balanceAmount,
        invoiceCount: 1,
        oldestInvoiceDate: sale.saleDate,
        daysPastDue: 0,
        creditLimit: customer.creditLimit,
        paymentTerms: customer.paymentTerms,
        customerAvatar: customer.avatar,
        status: 'current',
      };
      
      this.receivables.push(receivable);
    }
  }

  // Payables methods
  getPayables(): Payable[] {
    return [...this.payables];
  }

  // Address methods
  addAddress(address: BusinessAddress) {
    this.addresses.push(address);
    this.saveData(); // Save to persistent storage
    
    // Log the change
    this.logChange(
      'address_add',
      `Added ${address.type} address: ${address.name}`,
      null,
      {
        id: address.id,
        type: address.type,
        name: address.name,
        isPrimary: address.isPrimary,
        city: address.city,
        state: address.stateName
      }
    );
    
    this.notifyListeners();
  }

  getAddresses(): BusinessAddress[] {
    return [...this.addresses];
  }

  getAddressById(id: string): BusinessAddress | undefined {
    return this.addresses.find(address => address.id === id);
  }

  getAddressesByType(type: 'primary' | 'branch' | 'warehouse'): BusinessAddress[] {
    return this.addresses.filter(address => address.type === type);
  }

  updateAddress(id: string, updates: Partial<BusinessAddress>) {
    const index = this.addresses.findIndex(address => address.id === id);
    if (index !== -1) {
      const oldAddress = { ...this.addresses[index] };
      this.addresses[index] = { ...this.addresses[index], ...updates };
      this.saveData(); // Save to persistent storage
      
      // Log the change
      this.logChange(
        'address_edit',
        `Updated ${this.addresses[index].type} address: ${this.addresses[index].name}`,
        {
          id: oldAddress.id,
          type: oldAddress.type,
          name: oldAddress.name,
          city: oldAddress.city,
          state: oldAddress.stateName
        },
        {
          id: this.addresses[index].id,
          type: this.addresses[index].type,
          name: this.addresses[index].name,
          city: this.addresses[index].city,
          state: this.addresses[index].stateName
        },
        { updatedFields: Object.keys(updates).join(', ') }
      );
      
      this.notifyListeners();
    }
  }

  deleteAddress(id: string) {
    const index = this.addresses.findIndex(address => address.id === id);
    if (index !== -1) {
      const deletedAddress = { ...this.addresses[index] };
      this.addresses.splice(index, 1);
      this.saveData(); // Save to persistent storage
      
      // Log the change
      this.logChange(
        'address_delete',
        `Deleted ${deletedAddress.type} address: ${deletedAddress.name}`,
        {
          id: deletedAddress.id,
          type: deletedAddress.type,
          name: deletedAddress.name,
          city: deletedAddress.city,
          state: deletedAddress.stateName
        },
        null
      );
      
      this.notifyListeners();
    }
  }

  setPrimaryAddress(id: string) {
    // Find the current primary and the new primary
    const currentPrimary = this.addresses.find(addr => addr.isPrimary);
    const newPrimary = this.addresses.find(addr => addr.id === id);
    
    // Remove primary status from all addresses
    this.addresses.forEach(address => {
      address.isPrimary = false;
    });
    
    // Set the specified address as primary
    const address = this.addresses.find(addr => addr.id === id);
    if (address) {
      address.isPrimary = true;
      this.saveData(); // Save to persistent storage
      
      // Log the change
      this.logChange(
        'address_primary_change',
        `Changed primary address from ${currentPrimary?.name || 'none'} to ${newPrimary?.name}`,
        currentPrimary ? {
          id: currentPrimary.id,
          type: currentPrimary.type,
          name: currentPrimary.name
        } : null,
        {
          id: newPrimary?.id,
          type: newPrimary?.type,
          name: newPrimary?.name
        }
      );
      
      this.notifyListeners();
    }
  }

  getPrimaryAddress(): BusinessAddress | undefined {
    return this.addresses.find(address => address.isPrimary);
  }

  getAddressCountByType(type: 'primary' | 'branch' | 'warehouse'): number {
    return this.addresses.filter(address => address.type === type).length;
  }

  // Bank Account methods
  addBankAccount(bankAccount: BankAccount) {
    this.bankAccounts.push(bankAccount);
    this.saveData(); // Save to persistent storage
    console.log('=== BANK ACCOUNT ADDED TO STORE ===');
    console.log('Bank Account ID:', bankAccount.id);
    console.log('Bank Name:', bankAccount.bankName);
    console.log('Account Holder:', bankAccount.accountHolderName);
    console.log('Account Number:', bankAccount.accountNumber);
    console.log('UPI ID:', bankAccount.upiId);
    console.log('Is Primary:', bankAccount.isPrimary);
    console.log('Total bank accounts in store:', this.bankAccounts.length);
    console.log('Added at:', new Date().toISOString());
    console.log('====================================');
    
    // Log the change
    this.logChange(
      'bank_add',
      `Added bank account: ${bankAccount.bankName} - ${bankAccount.accountHolderName}`,
      null,
      {
        id: bankAccount.id,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        isPrimary: bankAccount.isPrimary,
        initialBalance: bankAccount.initialBalance
      }
    );
    
    this.notifyListeners();
  }

  getBankAccounts(): BankAccount[] {
    return [...this.bankAccounts];
  }

  getBankAccountById(id: string): BankAccount | undefined {
    return this.bankAccounts.find(account => account.id === id);
  }

  getPrimaryBankAccount(): BankAccount | undefined {
    return this.bankAccounts.find(account => account.isPrimary);
  }

  updateBankAccount(id: string, updates: Partial<BankAccount>) {
    const index = this.bankAccounts.findIndex(account => account.id === id);
    if (index !== -1) {
      const oldAccount = { ...this.bankAccounts[index] };
      this.bankAccounts[index] = { ...this.bankAccounts[index], ...updates };
      this.saveData(); // Save to persistent storage
      console.log('=== BANK ACCOUNT UPDATED ===');
      console.log('Bank Account ID:', id);
      console.log('Updated at:', new Date().toISOString());
      console.log('============================');
      
      // Log the change
      this.logChange(
        'bank_edit',
        `Updated bank account: ${this.bankAccounts[index].bankName} - ${this.bankAccounts[index].accountHolderName}`,
        {
          id: oldAccount.id,
          bankName: oldAccount.bankName,
          accountNumber: oldAccount.accountNumber,
          isPrimary: oldAccount.isPrimary
        },
        {
          id: this.bankAccounts[index].id,
          bankName: this.bankAccounts[index].bankName,
          accountNumber: this.bankAccounts[index].accountNumber,
          isPrimary: this.bankAccounts[index].isPrimary
        },
        { updatedFields: Object.keys(updates).join(', ') }
      );
      
      this.notifyListeners();
    }
  }

  deleteBankAccount(id: string) {
    const index = this.bankAccounts.findIndex(account => account.id === id);
    if (index !== -1) {
      const deletedAccount = this.bankAccounts[index];
      this.bankAccounts.splice(index, 1);
      this.saveData(); // Save to persistent storage
      console.log('=== BANK ACCOUNT DELETED ===');
      console.log('Bank Account ID:', id);
      console.log('Bank Name:', deletedAccount.bankName);
      console.log('Total bank accounts remaining:', this.bankAccounts.length);
      console.log('Deleted at:', new Date().toISOString());
      console.log('============================');
      
      // Log the change
      this.logChange(
        'bank_delete',
        `Deleted bank account: ${deletedAccount.bankName} - ${deletedAccount.accountHolderName}`,
        {
          id: deletedAccount.id,
          bankName: deletedAccount.bankName,
          accountNumber: deletedAccount.accountNumber,
          isPrimary: deletedAccount.isPrimary
        },
        null
      );
      
      this.notifyListeners();
    }
  }

  setPrimaryBankAccount(id: string) {
    // Find the current primary and the new primary
    const currentPrimary = this.bankAccounts.find(acc => acc.isPrimary);
    const newPrimary = this.bankAccounts.find(acc => acc.id === id);
    
    // Remove primary status from all bank accounts
    this.bankAccounts.forEach(account => {
      account.isPrimary = false;
    });
    
    // Set the specified account as primary
    const account = this.bankAccounts.find(acc => acc.id === id);
    if (account) {
      account.isPrimary = true;
      this.saveData(); // Save to persistent storage
      console.log('=== PRIMARY BANK ACCOUNT SET ===');
      console.log('Bank Account ID:', id);
      console.log('Bank Name:', account.bankName);
      console.log('Set at:', new Date().toISOString());
      console.log('=================================');
      
      // Log the change
      this.logChange(
        'bank_primary_change',
        `Changed primary bank from ${currentPrimary?.bankName || 'none'} to ${newPrimary?.bankName}`,
        currentPrimary ? {
          id: currentPrimary.id,
          bankName: currentPrimary.bankName,
          accountNumber: currentPrimary.accountNumber
        } : null,
        {
          id: newPrimary?.id,
          bankName: newPrimary?.bankName,
          accountNumber: newPrimary?.accountNumber
        }
      );
      
      this.notifyListeners();
    }
  }

  getBankAccountCount(): number {
    return this.bankAccounts.length;
  }

  // Bank Transaction methods
  addBankTransaction(transaction: BankTransaction) {
    this.bankTransactions.push(transaction);
    
    // Update bank account balance
    const bankAccount = this.getBankAccountById(transaction.bankAccountId);
    if (bankAccount) {
      if (transaction.type === 'credit') {
        bankAccount.balance += transaction.amount;
      } else {
        bankAccount.balance -= transaction.amount;
      }
    }
    
    console.log('=== BANK TRANSACTION ADDED ===');
    console.log('Transaction ID:', transaction.id);
    console.log('Bank Account ID:', transaction.bankAccountId);
    console.log('Type:', transaction.type);
    console.log('Amount:', transaction.amount);
    console.log('Description:', transaction.description);
    console.log('Total transactions in store:', this.bankTransactions.length);
    console.log('Added at:', new Date().toISOString());
    console.log('================================');
    this.notifyListeners();
  }

  getBankTransactions(bankAccountId?: string): BankTransaction[] {
    if (bankAccountId) {
      return this.bankTransactions.filter(t => t.bankAccountId === bankAccountId);
    }
    return [...this.bankTransactions];
  }

  getBankTransactionById(id: string): BankTransaction | undefined {
    return this.bankTransactions.find(t => t.id === id);
  }

  getBankTransactionsByType(bankAccountId: string, type: 'credit' | 'debit'): BankTransaction[] {
    return this.bankTransactions.filter(t => 
      t.bankAccountId === bankAccountId && t.type === type
    );
  }

  getBankAccountBalance(bankAccountId: string): number {
    const bankAccount = this.getBankAccountById(bankAccountId);
    return bankAccount?.balance || 0;
  }

  getTotalIncome(bankAccountId?: string): number {
    const transactions = bankAccountId 
      ? this.getBankTransactions(bankAccountId)
      : this.bankTransactions;
    
    return transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getTotalExpense(bankAccountId?: string): number {
    const transactions = bankAccountId 
      ? this.getBankTransactions(bankAccountId)
      : this.bankTransactions;
    
    return transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  // Cheque management methods
  clearCheque(transactionId: string, clearanceDate: string): boolean {
    const transaction = this.bankTransactions.find(t => t.id === transactionId);
    if (transaction && transaction.source === 'Cheque' && !transaction.isCleared) {
      transaction.isCleared = true;
      transaction.clearanceDate = clearanceDate;
      
      // Update bank account balance
      const bankAccount = this.getBankAccountById(transaction.bankAccountId);
      if (bankAccount) {
        if (transaction.type === 'credit') {
          bankAccount.balance += transaction.amount;
        } else {
          bankAccount.balance -= transaction.amount;
        }
      }
      
      this.notifyListeners();
      return true;
    }
    return false;
  }

  bounceCheque(transactionId: string): boolean {
    const transactionIndex = this.bankTransactions.findIndex(t => t.id === transactionId);
    if (transactionIndex !== -1 && this.bankTransactions[transactionIndex].source === 'Cheque' && !this.bankTransactions[transactionIndex].isCleared) {
      // Get transaction data before removing it
      const transaction = this.bankTransactions[transactionIndex];
      
      // Remove the transaction
      this.bankTransactions.splice(transactionIndex, 1);
      
      // Update bank account balance (reverse the transaction)
      if (transaction) {
        const bankAccount = this.getBankAccountById(transaction.bankAccountId);
        if (bankAccount) {
          if (transaction.type === 'credit') {
            bankAccount.balance -= transaction.amount;
          } else {
            bankAccount.balance += transaction.amount;
          }
        }
      }
      
      this.notifyListeners();
      return true;
    }
    return false;
  }

  getUnclearedCheques(bankAccountId: string): BankTransaction[] {
    return this.bankTransactions.filter(t => 
      t.bankAccountId === bankAccountId && 
      t.source === 'Cheque' && 
      !t.isCleared
    );
  }

  // Product deletion methods - remove all records related to a product
  deleteProductRecords(productId: string) {
    let deletedRecords = {
      sales: 0,
      invoices: 0,
      receivablesUpdated: 0
    };

    // Filter out sales that contain this product
    const originalSalesCount = this.sales.length;
    this.sales = this.sales.filter(sale => {
      const hasProduct = sale.items.some(item => item.productId === productId);
      return !hasProduct;
    });
    deletedRecords.sales = originalSalesCount - this.sales.length;

    // Filter out invoices that contain this product
    const originalInvoicesCount = this.invoices.length;
    this.invoices = this.invoices.filter(invoice => {
      const hasProduct = invoice.items.some(item => item.productId === productId);
      return !hasProduct;
    });
    deletedRecords.invoices = originalInvoicesCount - this.invoices.length;

    // Update receivables - recalculate totals without the deleted sales
    this.receivables.forEach(receivable => {
      const customerInvoices = this.invoices.filter(invoice => invoice.customerId === receivable.customerId);
      const newTotalReceivable = customerInvoices.reduce((sum, invoice) => sum + invoice.balanceAmount, 0);
      const newOverdueAmount = customerInvoices.reduce((sum, invoice) => {
        if (invoice.status === 'overdue') {
          return sum + invoice.balanceAmount;
        }
        return sum;
      }, 0);

      if (receivable.totalReceivable !== newTotalReceivable || receivable.overdueAmount !== newOverdueAmount) {
        receivable.totalReceivable = newTotalReceivable;
        receivable.overdueAmount = newOverdueAmount;
        receivable.invoiceCount = customerInvoices.length;
        receivable.status = newOverdueAmount > 0 ? 'overdue' : 'current';
        deletedRecords.receivablesUpdated++;
      }
    });

    // Remove receivables with zero amounts
    this.receivables = this.receivables.filter(receivable => receivable.totalReceivable > 0);

    console.log('=== PRODUCT RECORDS DELETED ===');
    console.log('Product ID:', productId);
    console.log('Sales deleted:', deletedRecords.sales);
    console.log('Invoices deleted:', deletedRecords.invoices);
    console.log('Receivables updated:', deletedRecords.receivablesUpdated);
    console.log('Deleted at:', new Date().toISOString());
    console.log('================================');

    this.notifyListeners();
    return deletedRecords;
  }

  // Get all records related to a product (for preview before deletion)
  getProductRecords(productId: string) {
    const relatedSales = this.sales.filter(sale => 
      sale.items.some(item => item.productId === productId)
    );
    
    const relatedInvoices = this.invoices.filter(invoice => 
      invoice.items.some(item => item.productId === productId)
    );

    const affectedCustomers = new Set();
    relatedSales.forEach(sale => affectedCustomers.add(sale.customerId));
    relatedInvoices.forEach(invoice => affectedCustomers.add(invoice.customerId));

    const relatedReceivables = this.receivables.filter(receivable => 
      affectedCustomers.has(receivable.customerId)
    );

    return {
      sales: relatedSales,
      invoices: relatedInvoices,
      receivables: relatedReceivables,
      totalSales: relatedSales.length,
      totalInvoices: relatedInvoices.length,
      totalReceivables: relatedReceivables.length,
      totalAmount: relatedSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    };
  }

  // Utility methods
  getCustomerCount(): number {
    return this.customers.length;
  }

  getSupplierCount(): number {
    return this.suppliers.length;
  }

  getSaleCount(): number {
    return this.sales.length;
  }

  getInvoiceCount(): number {
    return this.invoices.length;
  }

  // Signup Progress Methods
  updateSignupProgress(updates: Partial<SignupProgress>) {
    this.signupProgress = {
      ...this.signupProgress,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    this.saveData();
    
    console.log('=== SIGNUP PROGRESS UPDATED ===');
    console.log('Updated fields:', Object.keys(updates).join(', '));
    console.log('Current step:', this.signupProgress.currentStep);
    console.log('Full progress:', JSON.stringify(this.signupProgress, null, 2));
    console.log('================================');
  }

  getSignupProgress(): SignupProgress {
    return this.signupProgress;
  }

  // Get signup progress by mobile number
  async getSignupProgressByMobile(mobile: string): Promise<SignupProgress | null> {
    try {
      const signupProgressData = await AsyncStorage.getItem('signupProgress');
      if (signupProgressData) {
        const progress = JSON.parse(signupProgressData);
        if (progress.mobile === mobile) {
          console.log('📥 Found existing signup progress for mobile:', mobile);
          console.log('Progress:', JSON.stringify(progress, null, 2));
          return progress;
        }
      }
      console.log('📭 No signup progress found for mobile:', mobile);
      return null;
    } catch (error) {
      console.error('Error getting signup progress by mobile:', error);
      return null;
    }
  }

  clearSignupProgress() {
    this.signupProgress = {};
    this.saveData();
    console.log('✅ Signup progress cleared');
  }

  // Debug method to check AsyncStorage contents
  async debugAsyncStorage() {
    try {
      console.log('🔍 DEBUG: Checking AsyncStorage contents...');
      const keys = await AsyncStorage.getAllKeys();
      console.log('🔑 All AsyncStorage keys:', keys);
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`📦 ${key}:`, value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'null');
      }
    } catch (error) {
      console.error('❌ Error debugging AsyncStorage:', error);
    }
  }

  // Method to clear all data for fresh testing
  async clearAllDataForTesting() {
    try {
      console.log('🧹 CLEARING ALL DATA FOR FRESH TESTING...');
      
      // Clear all arrays and objects
      this.addresses = [];
      this.bankAccounts = [];
      this.customers = [];
      this.products = [];
      this.invoices = [];
      this.purchases = [];
      this.receivables = [];
      this.payables = [];
      this.bankTransactions = [];
      this.changeLogs = [];
      this.userAccounts = [];
      
      // Reset signup progress
      this.signupProgress = {};
      this.isSignupComplete = false;
      
      // Clear all AsyncStorage data
      await AsyncStorage.multiRemove([
        'addresses',
        'bankAccounts',
        'customers',
        'products',
        'invoices',
        'purchases',
        'receivables',
        'payables',
        'bankTransactions',
        'changeLogs',
        'userAccounts',
        'isSignupComplete',
        'signupProgress',
        'appSubscription', // Clear subscription data too
        'subscription_data' // Also clear the other subscription key
      ]);
      
      console.log('✅ ALL DATA CLEARED SUCCESSFULLY!');
      console.log('🎯 Ready for fresh signup testing');
      
      // Notify listeners
      this.notifyListeners();
      
    } catch (error) {
      console.error('❌ Error clearing data:', error);
    }
  }

  // User Account Methods
  createUserAccount(): UserAccount {
    const progress = this.signupProgress;
    const now = new Date().toISOString();
    
    console.log('🏗️ Creating user account with signup progress:', progress);
    console.log('📱 Mobile from progress:', progress.mobile);
    console.log('👤 Owner name from progress:', progress.ownerName);
    console.log('🏢 Business name from progress:', progress.businessName);
    
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
      createdAt: now,
      lastLoginAt: now,
      isActive: true,
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

    // Add to user accounts array
    this.userAccounts.push(userAccount);
    this.saveData();

    console.log('=== USER ACCOUNT CREATED ===');
    console.log('User ID:', userAccount.id);
    console.log('Mobile:', userAccount.mobile);
    console.log('Business Name:', userAccount.businessName);
    console.log('Created At:', userAccount.createdAt);
    console.log('============================');

    // Debug AsyncStorage after saving
    setTimeout(async () => {
      await this.debugAsyncStorage();
    }, 1000);

    return userAccount;
  }

  getUserAccountByMobile(mobile: string): UserAccount | null {
    console.log('🔍 Searching for user account with mobile:', mobile);
    console.log('📊 Total user accounts:', this.userAccounts.length);
    console.log('📋 All user accounts:', this.userAccounts.map(acc => ({ mobile: acc.mobile, isActive: acc.isActive })));
    
    const account = this.userAccounts.find(acc => acc.mobile === mobile && acc.isActive);
    if (account) {
      console.log('📱 Found user account for mobile:', mobile);
      console.log('Account ID:', account.id);
      console.log('Business Name:', account.businessName);
      console.log('Is Active:', account.isActive);
    } else {
      console.log('📭 No user account found for mobile:', mobile);
      console.log('🔍 Available mobiles:', this.userAccounts.map(acc => acc.mobile));
    }
    return account || null;
  }

  updateUserLastLogin(mobile: string): void {
    const account = this.userAccounts.find(acc => acc.mobile === mobile && acc.isActive);
    if (account) {
      account.lastLoginAt = new Date().toISOString();
      this.saveData();
      console.log('🔄 Updated last login for user:', mobile);
    }
  }

  getAllUserAccounts(): UserAccount[] {
    return this.userAccounts.filter(acc => acc.isActive);
  }

  deactivateUserAccount(mobile: string): void {
    const account = this.userAccounts.find(acc => acc.mobile === mobile);
    if (account) {
      account.isActive = false;
      this.saveData();
      console.log('🚫 Deactivated user account for mobile:', mobile);
    }
  }

  // Change Log Methods
  logChange(changeType: ChangeLog['changeType'], description: string, oldValue?: any, newValue?: any, metadata?: any) {
    const changeLog: ChangeLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      changeType,
      description,
      oldValue,
      newValue,
      metadata
    };
    
    this.changeLogs.push(changeLog);
    this.saveData();
    
    console.log('=== CHANGE LOGGED ===');
    console.log('Type:', changeType);
    console.log('Description:', description);
    console.log('Timestamp:', changeLog.timestamp);
    if (oldValue) console.log('Old Value:', JSON.stringify(oldValue, null, 2));
    if (newValue) console.log('New Value:', JSON.stringify(newValue, null, 2));
    if (metadata) console.log('Metadata:', JSON.stringify(metadata, null, 2));
    console.log('Total logs:', this.changeLogs.length);
    console.log('====================');
  }

  getChangeLogs(): ChangeLog[] {
    return this.changeLogs;
  }

  getChangeLogsByType(changeType: ChangeLog['changeType']): ChangeLog[] {
    return this.changeLogs.filter(log => log.changeType === changeType);
  }

  clearChangeLogs() {
    this.changeLogs = [];
    this.saveData();
    console.log('✅ Change logs cleared');
  }

  // Get comprehensive signup summary
  getSignupSummary() {
    const progress = this.signupProgress;
    const addresses = this.addresses;
    const bankAccounts = this.bankAccounts;
    const primaryAddress = addresses.find(addr => addr.isPrimary);
    const branchAddresses = addresses.filter(addr => addr.type === 'branch');
    const warehouseAddresses = addresses.filter(addr => addr.type === 'warehouse');
    const primaryBank = bankAccounts.find(bank => bank.isPrimary);
    const secondaryBanks = bankAccounts.filter(bank => !bank.isPrimary);
    
    const summary = {
      // User & Business Info
      userName: progress.ownerName,
      mobileNumber: progress.mobile,
      businessName: progress.businessName,
      businessType: progress.businessType,
      taxIdType: progress.taxIdType,
      taxIdValue: progress.taxIdValue,
      ownerDob: progress.ownerDob,
      
      // Addresses
      primaryAddress: primaryAddress ? {
        id: primaryAddress.id,
        name: primaryAddress.name,
        doorNumber: primaryAddress.doorNumber,
        addressLine1: primaryAddress.addressLine1,
        addressLine2: primaryAddress.addressLine2,
        city: primaryAddress.city,
        state: primaryAddress.stateName,
        stateCode: primaryAddress.stateCode,
        pincode: primaryAddress.pincode,
        type: primaryAddress.type
      } : null,
      
      branchAddresses: branchAddresses.map(addr => ({
        id: addr.id,
        name: addr.name,
        doorNumber: addr.doorNumber,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        city: addr.city,
        state: addr.stateName,
        stateCode: addr.stateCode,
        pincode: addr.pincode,
        manager: addr.manager,
        phone: addr.phone
      })),
      
      warehouseAddresses: warehouseAddresses.map(addr => ({
        id: addr.id,
        name: addr.name,
        doorNumber: addr.doorNumber,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        city: addr.city,
        state: addr.stateName,
        stateCode: addr.stateCode,
        pincode: addr.pincode,
        manager: addr.manager,
        phone: addr.phone
      })),
      
      totalAddresses: addresses.length,
      
      // Bank Accounts
      primaryBankAccount: primaryBank ? {
        id: primaryBank.id,
        bankName: primaryBank.bankName,
        accountHolderName: primaryBank.accountHolderName,
        accountNumber: primaryBank.accountNumber,
        ifscCode: primaryBank.ifscCode,
        branchName: primaryBank.branchName,
        initialBalance: primaryBank.initialBalance,
        upiId: primaryBank.upiId
      } : null,
      
      additionalBankAccounts: secondaryBanks.map(bank => ({
        id: bank.id,
        bankName: bank.bankName,
        accountHolderName: bank.accountHolderName,
        accountNumber: bank.accountNumber,
        ifscCode: bank.ifscCode,
        branchName: bank.branchName,
        initialBalance: bank.initialBalance,
        upiId: bank.upiId
      })),
      
      totalBankAccounts: bankAccounts.length,
      
      // Financial & Invoice Config
      initialCashBalance: progress.initialCashBalance,
      invoicePrefix: progress.invoicePrefix,
      invoicePattern: progress.invoicePattern,
      startingInvoiceNumber: progress.startingInvoiceNumber,
      fiscalYear: progress.fiscalYear,
      
      // Signup Status
      currentStep: progress.currentStep,
      lastUpdated: progress.lastUpdated,
      isComplete: this.isSignupComplete
    };
    
    console.log('=== COMPREHENSIVE SIGNUP SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    console.log('====================================');
    
    return summary;
  }

  // Subscribe to changes
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // Clear all data (for testing)
  async clearAll() {
    this.customers = [];
    this.suppliers = [];
    this.sales = [];
    this.invoices = [];
    this.receivables = [];
    this.payables = [];
    this.addresses = [];
    this.bankAccounts = [];
    this.bankTransactions = [];
    this.isSignupComplete = false;
    this.signupProgress = {};
    this.changeLogs = [];
    this.userAccounts = [];
    
    // Clear from AsyncStorage as well
    await AsyncStorage.removeItem('isSignupComplete');
    await AsyncStorage.removeItem('signupProgress');
    await AsyncStorage.removeItem('changeLogs');
    await AsyncStorage.removeItem('addresses');
    await AsyncStorage.removeItem('bankAccounts');
    await AsyncStorage.removeItem('userAccounts');
    await AsyncStorage.removeItem('cartItems');
    await AsyncStorage.removeItem('colorScheme');
    
    console.log('=== ALL DATA CLEARED ===');
    console.log('Cleared at:', new Date().toISOString());
    console.log('========================');
    this.notifyListeners();
  }

  // Clear addresses only (for testing)
  clearAddresses() {
    this.addresses = [];
    this.saveData();
    console.log('=== ADDRESSES CLEARED ===');
    console.log('Cleared at:', new Date().toISOString());
    console.log('==========================');
    this.notifyListeners();
  }

  // Signup completion methods
  setSignupComplete(complete: boolean) {
    this.isSignupComplete = complete;
    AsyncStorage.setItem('isSignupComplete', complete.toString());
    this.notifyListeners();
  }

  async getSignupComplete(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem('isSignupComplete');
      if (stored !== null) {
        this.isSignupComplete = stored === 'true';
      }
      return this.isSignupComplete;
    } catch (error) {
      console.error('Error loading signup complete status:', error);
      return this.isSignupComplete;
    }
  }


}

// Export singleton instance
export const dataStore = new DataStore(); 