// Comprehensive data store for the ERP app
// Manages customers, suppliers, sales, invoices, and inventory

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
      this.addresses[index] = { ...this.addresses[index], ...updates };
      this.notifyListeners();
    }
  }

  deleteAddress(id: string) {
    const index = this.addresses.findIndex(address => address.id === id);
    if (index !== -1) {
      this.addresses.splice(index, 1);
      this.notifyListeners();
    }
  }

  setPrimaryAddress(id: string) {
    // Remove primary status from all addresses
    this.addresses.forEach(address => {
      address.isPrimary = false;
    });
    
    // Set the specified address as primary
    const address = this.addresses.find(addr => addr.id === id);
    if (address) {
      address.isPrimary = true;
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
      this.bankAccounts[index] = { ...this.bankAccounts[index], ...updates };
      console.log('=== BANK ACCOUNT UPDATED ===');
      console.log('Bank Account ID:', id);
      console.log('Updated at:', new Date().toISOString());
      console.log('============================');
      this.notifyListeners();
    }
  }

  deleteBankAccount(id: string) {
    const index = this.bankAccounts.findIndex(account => account.id === id);
    if (index !== -1) {
      const deletedAccount = this.bankAccounts[index];
      this.bankAccounts.splice(index, 1);
      console.log('=== BANK ACCOUNT DELETED ===');
      console.log('Bank Account ID:', id);
      console.log('Bank Name:', deletedAccount.bankName);
      console.log('Total bank accounts remaining:', this.bankAccounts.length);
      console.log('Deleted at:', new Date().toISOString());
      console.log('============================');
      this.notifyListeners();
    }
  }

  setPrimaryBankAccount(id: string) {
    // Remove primary status from all bank accounts
    this.bankAccounts.forEach(account => {
      account.isPrimary = false;
    });
    
    // Set the specified account as primary
    const account = this.bankAccounts.find(acc => acc.id === id);
    if (account) {
      account.isPrimary = true;
      console.log('=== PRIMARY BANK ACCOUNT SET ===');
      console.log('Bank Account ID:', id);
      console.log('Bank Name:', account.bankName);
      console.log('Set at:', new Date().toISOString());
      console.log('=================================');
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
  clearAll() {
    this.customers = [];
    this.suppliers = [];
    this.sales = [];
    this.invoices = [];
    this.receivables = [];
    this.payables = [];
    this.addresses = [];
    this.bankAccounts = [];
    this.bankTransactions = [];
    console.log('=== ALL DATA CLEARED ===');
    console.log('Cleared at:', new Date().toISOString());
    console.log('========================');
    this.notifyListeners();
  }


}

// Export singleton instance
export const dataStore = new DataStore(); 