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

class DataStore {
  private customers: Customer[] = [];
  private suppliers: Supplier[] = [];
  private sales: Sale[] = [];
  private invoices: Invoice[] = [];
  private receivables: Receivable[] = [];
  private payables: Payable[] = [];
  private addresses: BusinessAddress[] = [];
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
    console.log('=== ALL DATA CLEARED ===');
    console.log('Cleared at:', new Date().toISOString());
    console.log('========================');
    this.notifyListeners();
  }
}

// Export singleton instance
export const dataStore = new DataStore(); 