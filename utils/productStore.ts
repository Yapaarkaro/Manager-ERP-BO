import { getProducts } from '@/services/backendApi';

export interface Product {
  id: string;
  name: string;
  image: string;
  productImages?: string[];
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  openingStock: number;
  unitPrice: number;
  salesPrice: number;
  hsnCode: string;
  barcode: string;
  taxRate: number;
  taxInclusive?: boolean;
  supplier?: string;
  supplierName?: string;
  location?: string;
  lastRestocked?: string;
  stockValue?: number;
  primaryUnit: string;
  secondaryUnit?: string;
  tertiaryUnit?: string;
  conversionRatio?: string;
  tertiaryConversionRatio?: string;
  useCompoundUnit?: boolean;
  urgencyLevel: 'normal' | 'low' | 'critical';
  batchNumber?: string;
  mrp?: string;
  brand?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  cessType?: 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp';
  cessRate?: number;
  cessAmount?: number;
  cessUnit?: string;
  quantityDecimals?: number;
}

class ProductStore {
  private products: Product[] = [];
  private productIndex = new Map<string, Product>();
  private listeners: (() => void)[] = [];
  private isLoading = false;
  private loadPromise: Promise<{ success: boolean; error?: string }> | null = null;

  private rebuildIndex() {
    this.productIndex.clear();
    for (const p of this.products) this.productIndex.set(p.id, p);
  }

  addProduct(product: Product) {
    this.products.push(product);
    this.productIndex.set(product.id, product);
    this.notifyListeners();
  }

  getProducts(): Product[] {
    return this.products;
  }

  getProductById(id: string): Product | undefined {
    return this.productIndex.get(id);
  }

  updateProduct(id: string, updatedProduct: Product) {
    const idx = this.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      const updated = { ...updatedProduct, id, updatedAt: new Date().toISOString() };
      this.products[idx] = updated;
      this.productIndex.set(id, updated);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  findByBarcode(barcode: string): Product | undefined {
    if (!barcode || typeof barcode !== 'string') return undefined;
    const raw = String(barcode).trim();
    if (!raw) return undefined;
    const bc = raw.toLowerCase();

    const exact = this.products.find(p => {
      const s = (p.barcode != null && p.barcode !== '') ? String(p.barcode).trim().toLowerCase() : '';
      return s === bc;
    });
    if (exact) return exact;

    const bcNoLeadingZeros = bc.replace(/^0+/, '');
    if (!bcNoLeadingZeros) return undefined;
    return this.products.find(p => {
      const s = (p.barcode != null && p.barcode !== '') ? String(p.barcode).trim().toLowerCase() : '';
      if (!s) return false;
      return s.replace(/^0+/, '') === bcNoLeadingZeros;
    });
  }

  /** Returns all products whose barcode contains the given string (for search). */
  findAllByBarcode(barcodeQuery: string): Product[] {
    if (!barcodeQuery || typeof barcodeQuery !== 'string') return [];
    const q = String(barcodeQuery).trim().toLowerCase();
    if (!q) return [];
    return this.products.filter(p => {
      const s = (p.barcode != null && p.barcode !== '') ? String(p.barcode).trim().toLowerCase() : '';
      return s.includes(q) || s.replace(/^0+/, '') === q.replace(/^0+/, '');
    });
  }

  searchProducts(query: string): Product[] {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    return this.products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const supplier = (p.supplier || '').toLowerCase();
      const hsnCode = (p.hsnCode || '').toLowerCase();
      const barcode = (p.barcode != null && p.barcode !== '') ? String(p.barcode).trim().toLowerCase() : '';
      return name.includes(q) || category.includes(q) || (supplier && supplier.includes(q)) || hsnCode.includes(q) || barcode.includes(q);
    });
  }

  deleteProduct(id: string) {
    const idx = this.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.products.splice(idx, 1);
      this.productIndex.delete(id);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  clearProducts() {
    this.products = [];
    this.productIndex.clear();
    this.notifyListeners();
  }

  getProductCount(): number {
    return this.products.length;
  }

  hasProducts(): boolean {
    return this.products.length > 0;
  }

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

  async loadProductsFromBackend(): Promise<{ success: boolean; error?: string }> {
    if (this.isLoading && this.loadPromise) return this.loadPromise;
    this.isLoading = true;
    this.loadPromise = this._doLoad();
    return this.loadPromise;
  }

  private async _doLoad(): Promise<{ success: boolean; error?: string }> {

    try {
      const result = await getProducts();

      if (!result.success || !result.products) {
        return { success: false, error: result.error };
      }

      const transformed: Product[] = result.products.map((bp: any) => {
        let images: string[] = [];
        if (bp.product_images) {
          if (Array.isArray(bp.product_images)) {
            images = bp.product_images;
          } else if (typeof bp.product_images === 'string') {
            try { images = JSON.parse(bp.product_images); } catch { images = [bp.product_images]; }
          }
        }

        let urgencyLevel: 'normal' | 'low' | 'critical' = 'normal';
        if (bp.current_stock !== undefined && bp.min_stock_level !== undefined) {
          if (bp.current_stock <= 0) urgencyLevel = 'critical';
          else if (bp.current_stock <= bp.min_stock_level) urgencyLevel = 'low';
        }

        const barcodeRaw = bp.barcode ?? bp.barcode_number ?? '';
        const barcodeStr = (barcodeRaw === null || barcodeRaw === undefined) ? '' : String(barcodeRaw).trim();

        return {
          id: bp.id,
          name: bp.name || '',
          image: images[0] || bp.product_image || '',
          productImages: images.length > 0 ? images : undefined,
          category: bp.category || '',
          currentStock: bp.current_stock || 0,
          minStockLevel: bp.min_stock_level || 0,
          maxStockLevel: bp.max_stock_level || 0,
          openingStock: bp.opening_stock || 0,
          unitPrice: bp.per_unit_price || bp.purchase_price || 0,
          salesPrice: bp.sales_price || 0,
          hsnCode: bp.hsn_code || '',
          barcode: barcodeStr,
          taxRate: bp.tax_rate || 0,
          taxInclusive: bp.tax_inclusive || false,
          supplier: bp.preferred_supplier_id || undefined,
          supplierName: bp.supplier_name || bp.preferred_supplier_name || undefined,
          location: bp.storage_location_name || '',
          lastRestocked: bp.last_restocked_at || bp.last_restocked || undefined,
          stockValue: bp.stock_value || undefined,
          primaryUnit: bp.primary_unit || '',
          secondaryUnit: bp.secondary_unit || undefined,
          tertiaryUnit: bp.tertiary_unit || undefined,
          conversionRatio: bp.conversion_ratio || undefined,
          tertiaryConversionRatio: bp.tertiary_conversion_ratio || undefined,
          useCompoundUnit: bp.use_compound_unit ?? (!!bp.secondary_unit && bp.secondary_unit !== 'None'),
          urgencyLevel,
          batchNumber: bp.batch_number || undefined,
          mrp: bp.mrp_price?.toString() || undefined,
          brand: bp.brand || undefined,
          description: bp.description || undefined,
          createdAt: bp.created_at || undefined,
          updatedAt: bp.updated_at || undefined,
          cessType: bp.cess_type || 'none',
          cessRate: bp.cess_rate || 0,
          cessAmount: bp.cess_amount || 0,
          cessUnit: bp.cess_unit || undefined,
          quantityDecimals: bp.quantity_decimals ?? 0,
        };
      });

      this.products = transformed;
      this.rebuildIndex();
      this.notifyListeners();
      return { success: true };
    } catch (error: any) {
      console.error('Error loading products from backend:', error?.message);
      return { success: false, error: error?.message || 'Failed to load products' };
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }
}

export const productStore = new ProductStore();

// Lightweight in-memory bridge to pass product IDs between screens
// instead of serializing full product objects through navigation params
let _pendingProductIds: string[] = [];

export const cartBridge = {
  setPendingProducts(ids: string[]) {
    _pendingProductIds = ids;
  },
  consumePendingProducts(): Product[] {
    const ids = _pendingProductIds;
    _pendingProductIds = [];
    return ids
      .map(id => productStore.getProductById(id))
      .filter((p): p is Product => p !== undefined);
  },
  hasPending(): boolean {
    return _pendingProductIds.length > 0;
  },
};

// In-memory bridge for passing cart data between Cart → CustomerDetails → Payment
// Avoids heavy JSON.stringify serialization through navigation params
let _pendingCartData: { cartItems: any[]; totalAmount: number; roundOffAmount?: number; gstType?: 'intra' | 'inter' } | null = null;

export const cartDataBridge = {
  setCartData(cartItems: any[], totalAmount: number, roundOffAmount?: number, gstType?: 'intra' | 'inter') {
    _pendingCartData = { cartItems, totalAmount, roundOffAmount, gstType };
  },
  consumeCartData(): { cartItems: any[]; totalAmount: number; roundOffAmount?: number; gstType?: 'intra' | 'inter' } | null {
    const data = _pendingCartData;
    _pendingCartData = null;
    return data;
  },
  hasPending(): boolean {
    return _pendingCartData !== null;
  },
};

// In-memory bridge for passing payment data from Payment → Success screen
let _pendingPaymentData: any = null;

export const paymentDataBridge = {
  setPaymentData(data: any) {
    _pendingPaymentData = data;
  },
  consumePaymentData(): any {
    const data = _pendingPaymentData;
    _pendingPaymentData = null;
    return data;
  },
  hasPending(): boolean {
    return _pendingPaymentData !== null;
  },
};

// Unified bridge for passing sale flow data across the entire flow
// CustomerDetails → Payment → Success without serialization through navigation params
export interface InvoiceExtras {
  deliveryNote?: string;
  paymentTermsMode?: string;
  referenceNo?: string;
  referenceDate?: string;
  buyerOrderNumber?: string;
  buyerOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchedVia?: string;
  destination?: string;
  termsOfDelivery?: string;
  customFields?: Array<{ label: string; value: string }>;
}

let _saleFlowData: {
  cartItems?: any[];
  totalAmount?: number;
  roundOffAmount?: number;
  customerDetails?: any;
  invoiceExtras?: InvoiceExtras;
} = {};

export const saleFlowBridge = {
  setCartAndTotal(cartItems: any[], totalAmount: number, roundOffAmount?: number) {
    _saleFlowData.cartItems = cartItems;
    _saleFlowData.totalAmount = totalAmount;
    _saleFlowData.roundOffAmount = roundOffAmount;
  },
  setCustomerDetails(customer: any) {
    _saleFlowData.customerDetails = customer;
  },
  setInvoiceExtras(extras: InvoiceExtras) {
    _saleFlowData.invoiceExtras = extras;
  },
  getCartItems(): any[] {
    return _saleFlowData.cartItems || [];
  },
  getTotalAmount(): number {
    return _saleFlowData.totalAmount || 0;
  },
  getRoundOffAmount(): number {
    return _saleFlowData.roundOffAmount || 0;
  },
  getCustomerDetails(): any {
    return _saleFlowData.customerDetails;
  },
  getInvoiceExtras(): InvoiceExtras | undefined {
    return _saleFlowData.invoiceExtras;
  },
  clear() {
    _saleFlowData = {};
  },
};
