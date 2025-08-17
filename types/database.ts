// Database types for Supabase
// These types match the database schema and existing interfaces

export interface Database {
  public: {
    Tables: {
      business_addresses: {
        Row: BusinessAddressRow;
        Insert: BusinessAddressInsert;
        Update: BusinessAddressUpdate;
      };
      customers: {
        Row: CustomerRow;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
      };
      suppliers: {
        Row: SupplierRow;
        Insert: SupplierInsert;
        Update: SupplierUpdate;
      };
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      sales: {
        Row: SaleRow;
        Insert: SaleInsert;
        Update: SaleUpdate;
      };
      sale_items: {
        Row: SaleItemRow;
        Insert: SaleItemInsert;
        Update: SaleItemUpdate;
      };
      invoices: {
        Row: InvoiceRow;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
      };
      invoice_items: {
        Row: InvoiceItemRow;
        Insert: InvoiceItemInsert;
        Update: InvoiceItemUpdate;
      };
      purchase_orders: {
        Row: PurchaseOrderRow;
        Insert: PurchaseOrderInsert;
        Update: PurchaseOrderUpdate;
      };
      po_items: {
        Row: POItemRow;
        Insert: POItemInsert;
        Update: POItemUpdate;
      };
      purchase_invoices: {
        Row: PurchaseInvoiceRow;
        Insert: PurchaseInvoiceInsert;
        Update: PurchaseInvoiceUpdate;
      };
      receivables: {
        Row: ReceivableRow;
        Insert: ReceivableInsert;
        Update: ReceivableUpdate;
      };
      payables: {
        Row: PayableRow;
        Insert: PayableInsert;
        Update: PayableUpdate;
      };
      expenses: {
        Row: ExpenseRow;
        Insert: ExpenseInsert;
        Update: ExpenseUpdate;
      };
      marketing_campaigns: {
        Row: MarketingCampaignRow;
        Insert: MarketingCampaignInsert;
        Update: MarketingCampaignUpdate;
      };
      returns: {
        Row: ReturnRow;
        Insert: ReturnInsert;
        Update: ReturnUpdate;
      };
      return_items: {
        Row: ReturnItemRow;
        Insert: ReturnItemInsert;
        Update: ReturnItemUpdate;
      };
      staff: {
        Row: StaffRow;
        Insert: StaffInsert;
        Update: StaffUpdate;
      };
      stock_movements: {
        Row: StockMovementRow;
        Insert: StockMovementInsert;
        Update: StockMovementUpdate;
      };
      stock_discrepancies: {
        Row: StockDiscrepancyRow;
        Insert: StockDiscrepancyInsert;
        Update: StockDiscrepancyUpdate;
      };
    };
  };
}

// Business Addresses
export interface BusinessAddressRow {
  id: string;
  name: string;
  type: 'primary' | 'branch' | 'warehouse';
  door_number: string | null;
  address_line1: string;
  address_line2: string | null;
  additional_lines: string[] | null;
  city: string;
  pincode: string;
  state_name: string;
  state_code: string;
  manager: string | null;
  phone: string | null;
  is_primary: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface BusinessAddressInsert {
  id?: string;
  name: string;
  type: 'primary' | 'branch' | 'warehouse';
  door_number?: string | null;
  address_line1: string;
  address_line2?: string | null;
  additional_lines?: string[] | null;
  city: string;
  pincode: string;
  state_name: string;
  state_code: string;
  manager?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  status?: 'active' | 'inactive';
}

export interface BusinessAddressUpdate {
  name?: string;
  type?: 'primary' | 'branch' | 'warehouse';
  door_number?: string | null;
  address_line1?: string;
  address_line2?: string | null;
  additional_lines?: string[] | null;
  city?: string;
  pincode?: string;
  state_name?: string;
  state_code?: string;
  manager?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  status?: 'active' | 'inactive';
}

// Customers
export interface CustomerRow {
  id: string;
  name: string;
  business_name: string | null;
  customer_type: 'business' | 'individual';
  contact_person: string;
  mobile: string;
  email: string | null;
  address: string;
  gstin: string | null;
  avatar: string | null;
  customer_score: number;
  on_time_payment: number;
  satisfaction_rating: number;
  response_time: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  total_value: number;
  average_order_value: number;
  return_rate: number;
  last_order_date: string | null;
  joined_date: string;
  status: 'active' | 'inactive' | 'suspended';
  payment_terms: string | null;
  credit_limit: number | null;
  categories: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInsert {
  id?: string;
  name: string;
  business_name?: string | null;
  customer_type: 'business' | 'individual';
  contact_person: string;
  mobile: string;
  email?: string | null;
  address: string;
  gstin?: string | null;
  avatar?: string | null;
  customer_score?: number;
  on_time_payment?: number;
  satisfaction_rating?: number;
  response_time?: number;
  total_orders?: number;
  completed_orders?: number;
  pending_orders?: number;
  cancelled_orders?: number;
  returned_orders?: number;
  total_value?: number;
  average_order_value?: number;
  return_rate?: number;
  last_order_date?: string | null;
  joined_date?: string;
  status?: 'active' | 'inactive' | 'suspended';
  payment_terms?: string | null;
  credit_limit?: number | null;
  categories?: string[] | null;
}

export interface CustomerUpdate {
  name?: string;
  business_name?: string | null;
  customer_type?: 'business' | 'individual';
  contact_person?: string;
  mobile?: string;
  email?: string | null;
  address?: string;
  gstin?: string | null;
  avatar?: string | null;
  customer_score?: number;
  on_time_payment?: number;
  satisfaction_rating?: number;
  response_time?: number;
  total_orders?: number;
  completed_orders?: number;
  pending_orders?: number;
  cancelled_orders?: number;
  returned_orders?: number;
  total_value?: number;
  average_order_value?: number;
  return_rate?: number;
  last_order_date?: string | null;
  joined_date?: string;
  status?: 'active' | 'inactive' | 'suspended';
  payment_terms?: string | null;
  credit_limit?: number | null;
  categories?: string[] | null;
}

// Suppliers
export interface SupplierRow {
  id: string;
  name: string;
  business_name: string | null;
  supplier_type: 'business' | 'individual';
  contact_person: string;
  mobile: string;
  email: string | null;
  address: string;
  gstin: string | null;
  avatar: string | null;
  supplier_score: number;
  on_time_delivery: number;
  quality_rating: number;
  response_time: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  total_value: number;
  last_order_date: string | null;
  joined_date: string;
  status: 'active' | 'inactive' | 'suspended';
  payment_terms: string;
  delivery_time: string;
  categories: string[] | null;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierInsert {
  id?: string;
  name: string;
  business_name?: string | null;
  supplier_type: 'business' | 'individual';
  contact_person: string;
  mobile: string;
  email?: string | null;
  address: string;
  gstin?: string | null;
  avatar?: string | null;
  supplier_score?: number;
  on_time_delivery?: number;
  quality_rating?: number;
  response_time?: number;
  total_orders?: number;
  completed_orders?: number;
  pending_orders?: number;
  cancelled_orders?: number;
  total_value?: number;
  last_order_date?: string | null;
  joined_date?: string;
  status?: 'active' | 'inactive' | 'suspended';
  payment_terms: string;
  delivery_time: string;
  categories?: string[] | null;
  product_count?: number;
}

export interface SupplierUpdate {
  name?: string;
  business_name?: string | null;
  supplier_type?: 'business' | 'individual';
  contact_person?: string;
  mobile?: string;
  email?: string | null;
  address?: string;
  gstin?: string | null;
  avatar?: string | null;
  supplier_score?: number;
  on_time_delivery?: number;
  quality_rating?: number;
  response_time?: number;
  total_orders?: number;
  completed_orders?: number;
  pending_orders?: number;
  cancelled_orders?: number;
  total_value?: number;
  last_order_date?: string | null;
  joined_date?: string;
  status?: 'active' | 'inactive' | 'suspended';
  payment_terms?: string;
  delivery_time?: string;
  categories?: string[] | null;
  product_count?: number;
}

// Products
export interface ProductRow {
  id: string;
  name: string;
  image: string | null;
  category: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  unit_price: number;
  sales_price: number;
  hsn_code: string;
  barcode: string | null;
  tax_rate: number;
  supplier_id: string | null;
  location_id: string | null;
  last_restocked: string | null;
  stock_value: number;
  primary_unit: string;
  secondary_unit: string | null;
  urgency_level: 'normal' | 'low' | 'critical';
  batch_number: string | null;
  cess_type: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cess_rate: number;
  cess_amount: number;
  cess_unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductInsert {
  id?: string;
  name: string;
  image?: string | null;
  category: string;
  current_stock?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  unit_price: number;
  sales_price: number;
  hsn_code: string;
  barcode?: string | null;
  tax_rate?: number;
  supplier_id?: string | null;
  location_id?: string | null;
  last_restocked?: string | null;
  stock_value?: number;
  primary_unit: string;
  secondary_unit?: string | null;
  urgency_level?: 'normal' | 'low' | 'critical';
  batch_number?: string | null;
  cess_type?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cess_rate?: number;
  cess_amount?: number;
  cess_unit?: string | null;
}

export interface ProductUpdate {
  name?: string;
  image?: string | null;
  category?: string;
  current_stock?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  unit_price?: number;
  sales_price?: number;
  hsn_code?: string;
  barcode?: string | null;
  tax_rate?: number;
  supplier_id?: string | null;
  location_id?: string | null;
  last_restocked?: string | null;
  stock_value?: number;
  primary_unit?: string;
  secondary_unit?: string | null;
  urgency_level?: 'normal' | 'low' | 'critical';
  batch_number?: string | null;
  cess_type?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cess_rate?: number;
  cess_amount?: number;
  cess_unit?: string | null;
}

// Sales
export interface SaleRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_type: 'business' | 'individual';
  subtotal: number;
  tax_amount: number;
  cess_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_method: string;
  others_method: string | null;
  sale_date: string;
  status: 'completed' | 'pending' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleInsert {
  id?: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_type: 'business' | 'individual';
  subtotal: number;
  tax_amount?: number;
  cess_amount?: number;
  total_amount: number;
  paid_amount?: number;
  balance_amount?: number;
  payment_method: string;
  others_method?: string | null;
  sale_date: string;
  status?: 'completed' | 'pending' | 'cancelled';
  notes?: string | null;
}

export interface SaleUpdate {
  invoice_number?: string;
  customer_id?: string;
  customer_name?: string;
  customer_type?: 'business' | 'individual';
  subtotal?: number;
  tax_amount?: number;
  cess_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  balance_amount?: number;
  payment_method?: string;
  others_method?: string | null;
  sale_date?: string;
  status?: 'completed' | 'pending' | 'cancelled';
  notes?: string | null;
}

// Sale Items
export interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  cess_type: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cess_rate: number;
  cess_amount: number;
  hsn_code: string;
  batch_number: string | null;
  primary_unit: string;
  created_at: string;
}

export interface SaleItemInsert {
  id?: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate?: number;
  tax_amount?: number;
  cess_type?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cess_rate?: number;
  cess_amount?: number;
  hsn_code: string;
  batch_number?: string | null;
  primary_unit: string;
}

export interface SaleItemUpdate {
  sale_id?: string;
  product_id?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  tax_rate?: number;
  tax_amount?: number;
  cess_type?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cess_rate?: number;
  cess_amount?: number;
  hsn_code?: string;
  batch_number?: string | null;
  primary_unit?: string;
}

// Invoices
export interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_type: 'business' | 'individual';
  subtotal: number;
  tax_amount: number;
  cess_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_method: string | null;
  invoice_date: string;
  due_date: string | null;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInsert {
  id?: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_type: 'business' | 'individual';
  subtotal: number;
  tax_amount?: number;
  cess_amount?: number;
  total_amount: number;
  paid_amount?: number;
  balance_amount?: number;
  payment_method?: string | null;
  invoice_date: string;
  due_date?: string | null;
  status?: 'paid' | 'partial' | 'unpaid' | 'overdue';
  notes?: string | null;
}

export interface InvoiceUpdate {
  invoice_number?: string;
  customer_id?: string;
  customer_name?: string;
  customer_type?: 'business' | 'individual';
  subtotal?: number;
  tax_amount?: number;
  cess_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  balance_amount?: number;
  payment_method?: string | null;
  invoice_date?: string;
  due_date?: string | null;
  status?: 'paid' | 'partial' | 'unpaid' | 'overdue';
  notes?: string | null;
}

// Invoice Items
export interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  cess_type: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cess_rate: number;
  cess_amount: number;
  hsn_code: string;
  batch_number: string | null;
  primary_unit: string;
  created_at: string;
}

export interface InvoiceItemInsert {
  id?: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate?: number;
  tax_amount?: number;
  cess_type?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cess_rate?: number;
  cess_amount?: number;
  hsn_code: string;
  batch_number?: string | null;
  primary_unit: string;
}

export interface InvoiceItemUpdate {
  invoice_id?: string;
  product_id?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  tax_rate?: number;
  tax_amount?: number;
  cess_type?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cess_rate?: number;
  cess_amount?: number;
  hsn_code?: string;
  batch_number?: string | null;
  primary_unit?: string;
}

// Purchase Orders
export interface PurchaseOrderRow {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  supplier_type: 'business' | 'individual';
  business_name: string | null;
  gstin: string | null;
  staff_name: string;
  staff_avatar: string | null;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  type: 'created' | 'received';
  amount: number;
  item_count: number;
  order_date: string;
  expected_delivery: string;
  supplier_avatar: string | null;
  terms: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderInsert {
  id?: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  supplier_type: 'business' | 'individual';
  business_name?: string | null;
  gstin?: string | null;
  staff_name: string;
  staff_avatar?: string | null;
  status?: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  type?: 'created' | 'received';
  amount: number;
  item_count?: number;
  order_date: string;
  expected_delivery: string;
  supplier_avatar?: string | null;
  terms?: string | null;
  notes?: string | null;
}

export interface PurchaseOrderUpdate {
  po_number?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_type?: 'business' | 'individual';
  business_name?: string | null;
  gstin?: string | null;
  staff_name?: string;
  staff_avatar?: string | null;
  status?: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  type?: 'created' | 'received';
  amount?: number;
  item_count?: number;
  order_date?: string;
  expected_delivery?: string;
  supplier_avatar?: string | null;
  terms?: string | null;
  notes?: string | null;
}

// PO Items
export interface POItemRow {
  id: string;
  po_id: string;
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

export interface POItemInsert {
  id?: string;
  po_id: string;
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface POItemUpdate {
  po_id?: string;
  product_id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  total?: number;
}

// Purchase Invoices
export interface PurchaseInvoiceRow {
  id: string;
  po_number: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  supplier_type: 'business' | 'individual';
  business_name: string | null;
  gstin: string | null;
  staff_name: string;
  staff_avatar: string | null;
  status: 'pending' | 'received' | 'partial' | 'cancelled';
  payment_status: 'paid' | 'pending' | 'overdue';
  payment_method: string;
  amount: number;
  item_count: number;
  invoice_date: string;
  expected_delivery: string;
  actual_delivery: string | null;
  supplier_avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoiceInsert {
  id?: string;
  po_number: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  supplier_type: 'business' | 'individual';
  business_name?: string | null;
  gstin?: string | null;
  staff_name: string;
  staff_avatar?: string | null;
  status?: 'pending' | 'received' | 'partial' | 'cancelled';
  payment_status?: 'paid' | 'pending' | 'overdue';
  payment_method?: string;
  amount: number;
  item_count?: number;
  invoice_date: string;
  expected_delivery: string;
  actual_delivery?: string | null;
  supplier_avatar?: string | null;
}

export interface PurchaseInvoiceUpdate {
  po_number?: string;
  invoice_number?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_type?: 'business' | 'individual';
  business_name?: string | null;
  gstin?: string | null;
  staff_name?: string;
  staff_avatar?: string | null;
  status?: 'pending' | 'received' | 'partial' | 'cancelled';
  payment_status?: 'paid' | 'pending' | 'overdue';
  payment_method?: string;
  amount?: number;
  item_count?: number;
  invoice_date?: string;
  expected_delivery?: string;
  actual_delivery?: string | null;
  supplier_avatar?: string | null;
}

// Receivables
export interface ReceivableRow {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_type: 'business' | 'individual';
  business_name: string | null;
  gstin: string | null;
  mobile: string;
  email: string | null;
  address: string;
  total_receivable: number;
  overdue_amount: number;
  invoice_count: number;
  oldest_invoice_date: string | null;
  days_past_due: number;
  credit_limit: number | null;
  payment_terms: string | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  customer_avatar: string | null;
  status: 'current' | 'overdue' | 'critical';
  created_at: string;
  updated_at: string;
}

export interface ReceivableInsert {
  id?: string;
  customer_id: string;
  customer_name: string;
  customer_type: 'business' | 'individual';
  business_name?: string | null;
  gstin?: string | null;
  mobile: string;
  email?: string | null;
  address: string;
  total_receivable?: number;
  overdue_amount?: number;
  invoice_count?: number;
  oldest_invoice_date?: string | null;
  days_past_due?: number;
  credit_limit?: number | null;
  payment_terms?: string | null;
  last_payment_date?: string | null;
  last_payment_amount?: number | null;
  customer_avatar?: string | null;
  status?: 'current' | 'overdue' | 'critical';
}

export interface ReceivableUpdate {
  customer_id?: string;
  customer_name?: string;
  customer_type?: 'business' | 'individual';
  business_name?: string | null;
  gstin?: string | null;
  mobile?: string;
  email?: string | null;
  address?: string;
  total_receivable?: number;
  overdue_amount?: number;
  invoice_count?: number;
  oldest_invoice_date?: string | null;
  days_past_due?: number;
  credit_limit?: number | null;
  payment_terms?: string | null;
  last_payment_date?: string | null;
  last_payment_amount?: number | null;
  customer_avatar?: string | null;
  status?: 'current' | 'overdue' | 'critical';
}

// Payables
export interface PayableRow {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_type: 'business' | 'individual';
  business_name: string | null;
  gstin: string | null;
  mobile: string;
  email: string | null;
  address: string;
  total_payable: number;
  overdue_amount: number;
  bill_count: number;
  oldest_bill_date: string | null;
  days_past_due: number;
  credit_limit: number | null;
  payment_terms: string | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  supplier_avatar: string | null;
  status: 'current' | 'overdue' | 'critical';
  created_at: string;
  updated_at: string;
}

export interface PayableInsert {
  id?: string;
  supplier_id: string;
  supplier_name: string;
  supplier_type: 'business' | 'individual';
  business_name?: string | null;
  gstin?: string | null;
  mobile: string;
  email?: string | null;
  address: string;
  total_payable?: number;
  overdue_amount?: number;
  bill_count?: number;
  oldest_bill_date?: string | null;
  days_past_due?: number;
  credit_limit?: number | null;
  payment_terms?: string | null;
  last_payment_date?: string | null;
  last_payment_amount?: number | null;
  supplier_avatar?: string | null;
  status?: 'current' | 'overdue' | 'critical';
}

export interface PayableUpdate {
  supplier_id?: string;
  supplier_name?: string;
  supplier_type?: 'business' | 'individual';
  business_name?: string | null;
  gstin?: string | null;
  mobile?: string;
  email?: string | null;
  address?: string;
  total_payable?: number;
  overdue_amount?: number;
  bill_count?: number;
  oldest_bill_date?: string | null;
  days_past_due?: number;
  credit_limit?: number | null;
  payment_terms?: string | null;
  last_payment_date?: string | null;
  last_payment_amount?: number | null;
  supplier_avatar?: string | null;
  status?: 'current' | 'overdue' | 'critical';
}

// Expenses
export interface ExpenseRow {
  id: string;
  type: string;
  custom_type: string | null;
  amount: number;
  payment_method: string;
  notes: string | null;
  proof_image: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseInsert {
  id?: string;
  type: string;
  custom_type?: string | null;
  amount: number;
  payment_method: string;
  notes?: string | null;
  proof_image?: string | null;
  expense_date?: string;
}

export interface ExpenseUpdate {
  type?: string;
  custom_type?: string | null;
  amount?: number;
  payment_method?: string;
  notes?: string | null;
  proof_image?: string | null;
  expense_date?: string;
}

// Marketing Campaigns
export interface MarketingCampaignRow {
  id: string;
  name: string;
  platform: string;
  start_date: string;
  end_date: string;
  budget: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  target_audience: string[] | null;
  objective: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaignInsert {
  id?: string;
  name: string;
  platform: string;
  start_date: string;
  end_date: string;
  budget: number;
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  target_audience?: string[] | null;
  objective: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: number;
}

export interface MarketingCampaignUpdate {
  name?: string;
  platform?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  target_audience?: string[] | null;
  objective?: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: number;
}

// Returns
export interface ReturnRow {
  id: string;
  return_number: string;
  original_invoice_id: string | null;
  original_invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_type: 'individual' | 'business';
  staff_name: string;
  staff_avatar: string | null;
  refund_status: 'refunded' | 'partially_refunded' | 'pending';
  amount: number;
  item_count: number;
  return_date: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface ReturnInsert {
  id?: string;
  return_number: string;
  original_invoice_id?: string | null;
  original_invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_type: 'individual' | 'business';
  staff_name: string;
  staff_avatar?: string | null;
  refund_status?: 'refunded' | 'partially_refunded' | 'pending';
  amount: number;
  item_count?: number;
  return_date?: string;
  reason: string;
}

export interface ReturnUpdate {
  return_number?: string;
  original_invoice_id?: string | null;
  original_invoice_number?: string;
  customer_id?: string;
  customer_name?: string;
  customer_type?: 'individual' | 'business';
  staff_name?: string;
  staff_avatar?: string | null;
  refund_status?: 'refunded' | 'partially_refunded' | 'pending';
  amount?: number;
  item_count?: number;
  return_date?: string;
  reason?: string;
}

// Return Items
export interface ReturnItemRow {
  id: string;
  return_id: string;
  product_id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  reason: string;
  created_at: string;
}

export interface ReturnItemInsert {
  id?: string;
  return_id: string;
  product_id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  reason: string;
}

export interface ReturnItemUpdate {
  return_id?: string;
  product_id?: string;
  name?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  total?: number;
  reason?: string;
}

// Staff
export interface StaffRow {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  avatar: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface StaffInsert {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  avatar?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface StaffUpdate {
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  avatar?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
}

// Stock Movements
export interface StockMovementRow {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_type: string;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface StockMovementInsert {
  id?: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_type: string;
  reference_id?: string | null;
  notes?: string | null;
}

export interface StockMovementUpdate {
  product_id?: string;
  movement_type?: 'in' | 'out' | 'adjustment';
  quantity?: number;
  previous_stock?: number;
  new_stock?: number;
  reference_type?: string;
  reference_id?: string | null;
  notes?: string | null;
}

// Stock Discrepancies
export interface StockDiscrepancyRow {
  id: string;
  product_id: string;
  expected_stock: number;
  actual_stock: number;
  discrepancy_amount: number;
  discrepancy_type: 'shortage' | 'excess';
  reason: string | null;
  status: 'open' | 'resolved' | 'investigating';
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockDiscrepancyInsert {
  id?: string;
  product_id: string;
  expected_stock: number;
  actual_stock: number;
  discrepancy_amount: number;
  discrepancy_type: 'shortage' | 'excess';
  reason?: string | null;
  status?: 'open' | 'resolved' | 'investigating';
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface StockDiscrepancyUpdate {
  product_id?: string;
  expected_stock?: number;
  actual_stock?: number;
  discrepancy_amount?: number;
  discrepancy_type?: 'shortage' | 'excess';
  reason?: string | null;
  status?: 'open' | 'resolved' | 'investigating';
  resolved_at?: string | null;
  resolved_by?: string | null;
} 