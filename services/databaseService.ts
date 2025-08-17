import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';
import {
  CustomerRow, CustomerInsert, CustomerUpdate,
  SupplierRow, SupplierInsert, SupplierUpdate,
  ProductRow, ProductInsert, ProductUpdate,
  SaleRow, SaleInsert, SaleUpdate,
  SaleItemRow, SaleItemInsert, SaleItemUpdate,
  InvoiceRow, InvoiceInsert, InvoiceUpdate,
  InvoiceItemRow, InvoiceItemInsert, InvoiceItemUpdate,
  PurchaseOrderRow, PurchaseOrderInsert, PurchaseOrderUpdate,
  POItemRow, POItemInsert, POItemUpdate,
  PurchaseInvoiceRow, PurchaseInvoiceInsert, PurchaseInvoiceUpdate,
  ReceivableRow, ReceivableInsert, ReceivableUpdate,
  PayableRow, PayableInsert, PayableUpdate,
  ExpenseRow, ExpenseInsert, ExpenseUpdate,
  MarketingCampaignRow, MarketingCampaignInsert, MarketingCampaignUpdate,
  ReturnRow, ReturnInsert, ReturnUpdate,
  ReturnItemRow, ReturnItemInsert, ReturnItemUpdate,
  StaffRow, StaffInsert, StaffUpdate,
  StockMovementRow, StockMovementInsert, StockMovementUpdate,
  StockDiscrepancyRow, StockDiscrepancyInsert, StockDiscrepancyUpdate,
  BusinessAddressRow, BusinessAddressInsert, BusinessAddressUpdate,
} from '../types/database';

// Generic CRUD operations
class DatabaseService {
  // Generic methods for any table
  async getAll<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      handleSupabaseError(error);
    }
    
    return data;
  }

  async insert<T>(table: string, data: any): Promise<T> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    return handleSupabaseSuccess(result, error);
  }

  async update<T>(table: string, id: string, data: any): Promise<T> {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    return handleSupabaseSuccess(result, error);
  }

  async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) {
      handleSupabaseError(error);
    }
  }

  async search<T>(table: string, column: string, query: string): Promise<T[]> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .ilike(column, `%${query}%`)
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Customer Service
export class CustomerService extends DatabaseService {
  async getCustomers(): Promise<CustomerRow[]> {
    return this.getAll<CustomerRow>(TABLES.CUSTOMERS);
  }

  async getCustomerById(id: string): Promise<CustomerRow | null> {
    return this.getById<CustomerRow>(TABLES.CUSTOMERS, id);
  }

  async createCustomer(customer: CustomerInsert): Promise<CustomerRow> {
    return this.insert<CustomerRow>(TABLES.CUSTOMERS, customer);
  }

  async updateCustomer(id: string, updates: CustomerUpdate): Promise<CustomerRow> {
    return this.update<CustomerRow>(TABLES.CUSTOMERS, id, updates);
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.delete(TABLES.CUSTOMERS, id);
  }

  async searchCustomers(query: string): Promise<CustomerRow[]> {
    return this.search<CustomerRow>(TABLES.CUSTOMERS, 'name', query);
  }

  async getCustomersByType(type: 'business' | 'individual'): Promise<CustomerRow[]> {
    const { data, error } = await supabase
      .from(TABLES.CUSTOMERS)
      .select('*')
      .eq('customer_type', type)
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getCustomersByStatus(status: 'active' | 'inactive' | 'suspended'): Promise<CustomerRow[]> {
    const { data, error } = await supabase
      .from(TABLES.CUSTOMERS)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Supplier Service
export class SupplierService extends DatabaseService {
  async getSuppliers(): Promise<SupplierRow[]> {
    return this.getAll<SupplierRow>(TABLES.SUPPLIERS);
  }

  async getSupplierById(id: string): Promise<SupplierRow | null> {
    return this.getById<SupplierRow>(TABLES.SUPPLIERS, id);
  }

  async createSupplier(supplier: SupplierInsert): Promise<SupplierRow> {
    return this.insert<SupplierRow>(TABLES.SUPPLIERS, supplier);
  }

  async updateSupplier(id: string, updates: SupplierUpdate): Promise<SupplierRow> {
    return this.update<SupplierRow>(TABLES.SUPPLIERS, id, updates);
  }

  async deleteSupplier(id: string): Promise<void> {
    return this.delete(TABLES.SUPPLIERS, id);
  }

  async searchSuppliers(query: string): Promise<SupplierRow[]> {
    return this.search<SupplierRow>(TABLES.SUPPLIERS, 'name', query);
  }

  async getSuppliersByType(type: 'business' | 'individual'): Promise<SupplierRow[]> {
    const { data, error } = await supabase
      .from(TABLES.SUPPLIERS)
      .select('*')
      .eq('supplier_type', type)
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Product Service
export class ProductService extends DatabaseService {
  async getProducts(): Promise<ProductRow[]> {
    return this.getAll<ProductRow>(TABLES.PRODUCTS);
  }

  async getProductById(id: string): Promise<ProductRow | null> {
    return this.getById<ProductRow>(TABLES.PRODUCTS, id);
  }

  async createProduct(product: ProductInsert): Promise<ProductRow> {
    return this.insert<ProductRow>(TABLES.PRODUCTS, product);
  }

  async updateProduct(id: string, updates: ProductUpdate): Promise<ProductRow> {
    return this.update<ProductRow>(TABLES.PRODUCTS, id, updates);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.delete(TABLES.PRODUCTS, id);
  }

  async searchProducts(query: string): Promise<ProductRow[]> {
    return this.search<ProductRow>(TABLES.PRODUCTS, 'name', query);
  }

  async getProductsByCategory(category: string): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getLowStockProducts(): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .lte('current_stock', 'min_stock_level')
      .order('current_stock', { ascending: true });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getProductsBySupplier(supplierId: string): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async updateStock(productId: string, newStock: number): Promise<ProductRow> {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .update({ 
        current_stock: newStock,
        stock_value: newStock * (await this.getProductById(productId)).then(p => p?.unit_price || 0)
      })
      .eq('id', productId)
      .select()
      .single();
    
    return handleSupabaseSuccess(data, error);
  }
}

// Sale Service
export class SaleService extends DatabaseService {
  async getSales(): Promise<SaleRow[]> {
    return this.getAll<SaleRow>(TABLES.SALES);
  }

  async getSaleById(id: string): Promise<SaleRow | null> {
    return this.getById<SaleRow>(TABLES.SALES, id);
  }

  async createSale(sale: SaleInsert): Promise<SaleRow> {
    return this.insert<SaleRow>(TABLES.SALES, sale);
  }

  async updateSale(id: string, updates: SaleUpdate): Promise<SaleRow> {
    return this.update<SaleRow>(TABLES.SALES, id, updates);
  }

  async deleteSale(id: string): Promise<void> {
    return this.delete(TABLES.SALES, id);
  }

  async getSalesByCustomer(customerId: string): Promise<SaleRow[]> {
    const { data, error } = await supabase
      .from(TABLES.SALES)
      .select('*')
      .eq('customer_id', customerId)
      .order('sale_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<SaleRow[]> {
    const { data, error } = await supabase
      .from(TABLES.SALES)
      .select('*')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .order('sale_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getSalesByStatus(status: 'completed' | 'pending' | 'cancelled'): Promise<SaleRow[]> {
    const { data, error } = await supabase
      .from(TABLES.SALES)
      .select('*')
      .eq('status', status)
      .order('sale_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Sale Item Service
export class SaleItemService extends DatabaseService {
  async getSaleItems(saleId: string): Promise<SaleItemRow[]> {
    const { data, error } = await supabase
      .from(TABLES.SALE_ITEMS)
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: true });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async createSaleItem(item: SaleItemInsert): Promise<SaleItemRow> {
    return this.insert<SaleItemRow>(TABLES.SALE_ITEMS, item);
  }

  async createSaleItems(items: SaleItemInsert[]): Promise<SaleItemRow[]> {
    const { data, error } = await supabase
      .from(TABLES.SALE_ITEMS)
      .insert(items)
      .select();
    
    return handleSupabaseSuccess(data || [], error);
  }

  async updateSaleItem(id: string, updates: SaleItemUpdate): Promise<SaleItemRow> {
    return this.update<SaleItemRow>(TABLES.SALE_ITEMS, id, updates);
  }

  async deleteSaleItem(id: string): Promise<void> {
    return this.delete(TABLES.SALE_ITEMS, id);
  }
}

// Invoice Service
export class InvoiceService extends DatabaseService {
  async getInvoices(): Promise<InvoiceRow[]> {
    return this.getAll<InvoiceRow>(TABLES.INVOICES);
  }

  async getInvoiceById(id: string): Promise<InvoiceRow | null> {
    return this.getById<InvoiceRow>(TABLES.INVOICES, id);
  }

  async createInvoice(invoice: InvoiceInsert): Promise<InvoiceRow> {
    return this.insert<InvoiceRow>(TABLES.INVOICES, invoice);
  }

  async updateInvoice(id: string, updates: InvoiceUpdate): Promise<InvoiceRow> {
    return this.update<InvoiceRow>(TABLES.INVOICES, id, updates);
  }

  async deleteInvoice(id: string): Promise<void> {
    return this.delete(TABLES.INVOICES, id);
  }

  async getInvoicesByCustomer(customerId: string): Promise<InvoiceRow[]> {
    const { data, error } = await supabase
      .from(TABLES.INVOICES)
      .select('*')
      .eq('customer_id', customerId)
      .order('invoice_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getInvoicesByStatus(status: 'paid' | 'partial' | 'unpaid' | 'overdue'): Promise<InvoiceRow[]> {
    const { data, error } = await supabase
      .from(TABLES.INVOICES)
      .select('*')
      .eq('status', status)
      .order('invoice_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getOverdueInvoices(): Promise<InvoiceRow[]> {
    const { data, error } = await supabase
      .from(TABLES.INVOICES)
      .select('*')
      .lt('due_date', new Date().toISOString())
      .neq('status', 'paid')
      .order('due_date', { ascending: true });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Purchase Order Service
export class PurchaseOrderService extends DatabaseService {
  async getPurchaseOrders(): Promise<PurchaseOrderRow[]> {
    return this.getAll<PurchaseOrderRow>(TABLES.PURCHASE_ORDERS);
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrderRow | null> {
    return this.getById<PurchaseOrderRow>(TABLES.PURCHASE_ORDERS, id);
  }

  async createPurchaseOrder(po: PurchaseOrderInsert): Promise<PurchaseOrderRow> {
    return this.insert<PurchaseOrderRow>(TABLES.PURCHASE_ORDERS, po);
  }

  async updatePurchaseOrder(id: string, updates: PurchaseOrderUpdate): Promise<PurchaseOrderRow> {
    return this.update<PurchaseOrderRow>(TABLES.PURCHASE_ORDERS, id, updates);
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    return this.delete(TABLES.PURCHASE_ORDERS, id);
  }

  async getPurchaseOrdersBySupplier(supplierId: string): Promise<PurchaseOrderRow[]> {
    const { data, error } = await supabase
      .from(TABLES.PURCHASE_ORDERS)
      .select('*')
      .eq('supplier_id', supplierId)
      .order('order_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getPurchaseOrdersByStatus(status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'): Promise<PurchaseOrderRow[]> {
    const { data, error } = await supabase
      .from(TABLES.PURCHASE_ORDERS)
      .select('*')
      .eq('status', status)
      .order('order_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Expense Service
export class ExpenseService extends DatabaseService {
  async getExpenses(): Promise<ExpenseRow[]> {
    return this.getAll<ExpenseRow>(TABLES.EXPENSES);
  }

  async getExpenseById(id: string): Promise<ExpenseRow | null> {
    return this.getById<ExpenseRow>(TABLES.EXPENSES, id);
  }

  async createExpense(expense: ExpenseInsert): Promise<ExpenseRow> {
    return this.insert<ExpenseRow>(TABLES.EXPENSES, expense);
  }

  async updateExpense(id: string, updates: ExpenseUpdate): Promise<ExpenseRow> {
    return this.update<ExpenseRow>(TABLES.EXPENSES, id, updates);
  }

  async deleteExpense(id: string): Promise<void> {
    return this.delete(TABLES.EXPENSES, id);
  }

  async getExpensesByType(type: string): Promise<ExpenseRow[]> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .eq('type', type)
      .order('expense_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<ExpenseRow[]> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Marketing Campaign Service
export class MarketingCampaignService extends DatabaseService {
  async getCampaigns(): Promise<MarketingCampaignRow[]> {
    return this.getAll<MarketingCampaignRow>(TABLES.MARKETING_CAMPAIGNS);
  }

  async getCampaignById(id: string): Promise<MarketingCampaignRow | null> {
    return this.getById<MarketingCampaignRow>(TABLES.MARKETING_CAMPAIGNS, id);
  }

  async createCampaign(campaign: MarketingCampaignInsert): Promise<MarketingCampaignRow> {
    return this.insert<MarketingCampaignRow>(TABLES.MARKETING_CAMPAIGNS, campaign);
  }

  async updateCampaign(id: string, updates: MarketingCampaignUpdate): Promise<MarketingCampaignRow> {
    return this.update<MarketingCampaignRow>(TABLES.MARKETING_CAMPAIGNS, id, updates);
  }

  async deleteCampaign(id: string): Promise<void> {
    return this.delete(TABLES.MARKETING_CAMPAIGNS, id);
  }

  async getActiveCampaigns(): Promise<MarketingCampaignRow[]> {
    const { data, error } = await supabase
      .from(TABLES.MARKETING_CAMPAIGNS)
      .select('*')
      .eq('status', 'active')
      .order('start_date', { ascending: true });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Return Service
export class ReturnService extends DatabaseService {
  async getReturns(): Promise<ReturnRow[]> {
    return this.getAll<ReturnRow>(TABLES.RETURNS);
  }

  async getReturnById(id: string): Promise<ReturnRow | null> {
    return this.getById<ReturnRow>(TABLES.RETURNS, id);
  }

  async createReturn(returnData: ReturnInsert): Promise<ReturnRow> {
    return this.insert<ReturnRow>(TABLES.RETURNS, returnData);
  }

  async updateReturn(id: string, updates: ReturnUpdate): Promise<ReturnRow> {
    return this.update<ReturnRow>(TABLES.RETURNS, id, updates);
  }

  async deleteReturn(id: string): Promise<void> {
    return this.delete(TABLES.RETURNS, id);
  }

  async getReturnsByCustomer(customerId: string): Promise<ReturnRow[]> {
    const { data, error } = await supabase
      .from(TABLES.RETURNS)
      .select('*')
      .eq('customer_id', customerId)
      .order('return_date', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Business Address Service
export class BusinessAddressService extends DatabaseService {
  async getAddresses(): Promise<BusinessAddressRow[]> {
    return this.getAll<BusinessAddressRow>(TABLES.BUSINESS_ADDRESSES);
  }

  async getAddressById(id: string): Promise<BusinessAddressRow | null> {
    return this.getById<BusinessAddressRow>(TABLES.BUSINESS_ADDRESSES, id);
  }

  async createAddress(address: BusinessAddressInsert): Promise<BusinessAddressRow> {
    return this.insert<BusinessAddressRow>(TABLES.BUSINESS_ADDRESSES, address);
  }

  async updateAddress(id: string, updates: BusinessAddressUpdate): Promise<BusinessAddressRow> {
    return this.update<BusinessAddressRow>(TABLES.BUSINESS_ADDRESSES, id, updates);
  }

  async deleteAddress(id: string): Promise<void> {
    return this.delete(TABLES.BUSINESS_ADDRESSES, id);
  }

  async getAddressesByType(type: 'primary' | 'branch' | 'warehouse'): Promise<BusinessAddressRow[]> {
    const { data, error } = await supabase
      .from(TABLES.BUSINESS_ADDRESSES)
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async getPrimaryAddress(): Promise<BusinessAddressRow | null> {
    const { data, error } = await supabase
      .from(TABLES.BUSINESS_ADDRESSES)
      .select('*')
      .eq('is_primary', true)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      handleSupabaseError(error);
    }
    
    return data;
  }
}

// Stock Movement Service
export class StockMovementService extends DatabaseService {
  async getStockMovements(): Promise<StockMovementRow[]> {
    return this.getAll<StockMovementRow>(TABLES.STOCK_MOVEMENTS);
  }

  async getStockMovementsByProduct(productId: string): Promise<StockMovementRow[]> {
    const { data, error } = await supabase
      .from(TABLES.STOCK_MOVEMENTS)
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }

  async createStockMovement(movement: StockMovementInsert): Promise<StockMovementRow> {
    return this.insert<StockMovementRow>(TABLES.STOCK_MOVEMENTS, movement);
  }

  async getStockMovementsByDateRange(startDate: string, endDate: string): Promise<StockMovementRow[]> {
    const { data, error } = await supabase
      .from(TABLES.STOCK_MOVEMENTS)
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
    
    return handleSupabaseSuccess(data || [], error);
  }
}

// Export service instances
export const customerService = new CustomerService();
export const supplierService = new SupplierService();
export const productService = new ProductService();
export const saleService = new SaleService();
export const saleItemService = new SaleItemService();
export const invoiceService = new InvoiceService();
export const purchaseOrderService = new PurchaseOrderService();
export const expenseService = new ExpenseService();
export const marketingCampaignService = new MarketingCampaignService();
export const returnService = new ReturnService();
export const businessAddressService = new BusinessAddressService();
export const stockMovementService = new StockMovementService(); 