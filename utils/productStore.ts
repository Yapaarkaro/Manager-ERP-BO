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
  location?: string;
  lastRestocked?: string;
  stockValue?: number;
  primaryUnit: string;
  secondaryUnit?: string;
  tertiaryUnit?: string;
  conversionRatio?: string;
  tertiaryConversionRatio?: string;
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
}

class ProductStore {
  private products: Product[] = [];
  private listeners: (() => void)[] = [];
  private isLoading = false;

  addProduct(product: Product) {
    this.products.push(product);
    this.notifyListeners();
  }

  getProducts(): Product[] {
    return [...this.products];
  }

  getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  updateProduct(id: string, updatedProduct: Product) {
    const idx = this.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.products[idx] = { ...updatedProduct, id, updatedAt: new Date().toISOString() };
      this.notifyListeners();
      return true;
    }
    return false;
  }

  searchProducts(query: string): Product[] {
    const q = query.toLowerCase();
    return this.products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.supplier && p.supplier.toLowerCase().includes(q)) ||
      p.hsnCode.includes(query) ||
      p.barcode.includes(query)
    );
  }

  deleteProduct(id: string) {
    const idx = this.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.products.splice(idx, 1);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  clearProducts() {
    this.products = [];
    this.notifyListeners();
  }

  getProductCount(): number {
    return this.products.length;
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
    if (this.isLoading) return { success: false, error: 'Already loading' };
    this.isLoading = true;

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
          barcode: bp.barcode || '',
          taxRate: bp.tax_rate || 0,
          taxInclusive: bp.tax_inclusive || false,
          supplier: bp.preferred_supplier_id || undefined,
          location: bp.storage_location_name || '',
          lastRestocked: bp.last_restocked_at || bp.last_restocked || undefined,
          stockValue: bp.stock_value || undefined,
          primaryUnit: bp.primary_unit || '',
          secondaryUnit: bp.secondary_unit || undefined,
          tertiaryUnit: bp.tertiary_unit || undefined,
          conversionRatio: bp.conversion_ratio || undefined,
          tertiaryConversionRatio: bp.tertiary_conversion_ratio || undefined,
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
        };
      });

      this.products = transformed;
      this.notifyListeners();
      return { success: true };
    } catch (error: any) {
      console.error('Error loading products from backend:', error?.message);
      return { success: false, error: error?.message || 'Failed to load products' };
    } finally {
      this.isLoading = false;
    }
  }
}

export const productStore = new ProductStore();
