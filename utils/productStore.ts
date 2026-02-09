// Simple global product store for the ERP app
// In a real app, this would be replaced with proper state management like Redux or Context API

import { getProducts } from '@/services/backendApi';

export interface Product {
  id: string;
  name: string;
  image: string;
  productImages?: string[]; // Array of product image URLs
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
  taxInclusive?: boolean; // New field for tax inclusion
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
  // Additional fields
  mrp?: string;
  brand?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  // CESS fields
  cessType?: 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp';
  cessRate?: number;
  cessAmount?: number;
  cessUnit?: string;
}

class ProductStore {
  private products: Product[] = [];
  private listeners: (() => void)[] = [];

  // Add a product to the store
  addProduct(product: Product) {
    this.products.push(product);
    console.log('=== PRODUCT ADDED TO STORE ===');
    console.log('Product ID:', product.id);
    console.log('Product Name:', product.name);
    console.log('Category:', product.category);
    console.log('Current Stock:', product.currentStock);
    console.log('Unit Price:', product.unitPrice);
    console.log('Sales Price:', product.salesPrice);
    console.log('HSN Code:', product.hsnCode);
    console.log('Batch Number:', product.batchNumber);
    console.log('Barcode:', product.barcode);
    console.log('Tax Rate:', product.taxRate);
    console.log('Supplier:', product.supplier);
    console.log('Location:', product.location);
    console.log('Primary Unit:', product.primaryUnit);
    console.log('Secondary Unit:', product.secondaryUnit);
    console.log('Tertiary Unit:', product.tertiaryUnit);
    console.log('Conversion Ratio:', product.conversionRatio);
    console.log('Tertiary Conversion Ratio:', product.tertiaryConversionRatio);
    console.log('Urgency Level:', product.urgencyLevel);
    console.log('Total products in store:', this.products.length);
    console.log('Added at:', new Date().toISOString());
    console.log('================================');
    this.notifyListeners();
  }

  // Get all products
  getProducts(): Product[] {
    return [...this.products];
  }

  // Get a product by ID
  getProductById(id: string): Product | undefined {
    return this.products.find(product => product.id === id);
  }

  // Update a product in the store
  updateProduct(id: string, updatedProduct: Product) {
    const index = this.products.findIndex(product => product.id === id);
    if (index !== -1) {
      this.products[index] = { ...updatedProduct, id, updatedAt: new Date().toISOString() };
      console.log('=== PRODUCT UPDATED IN STORE ===');
      console.log('Product ID:', id);
      console.log('Product Name:', updatedProduct.name);
      console.log('Updated at:', new Date().toISOString());
      console.log('=================================');
      this.notifyListeners();
      return true;
    }
    console.log('❌ Product not found for update:', id);
    return false;
  }

  // Search products
  searchProducts(query: string): Product[] {
    const lowercaseQuery = query.toLowerCase();
    return this.products.filter(product =>
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.category.toLowerCase().includes(lowercaseQuery) ||
      (product.supplier && product.supplier.toLowerCase().includes(lowercaseQuery)) ||
      product.hsnCode.includes(query) ||
      product.barcode.includes(query)
    );
  }

  // Delete a product from the store
  deleteProduct(id: string) {
    const index = this.products.findIndex(product => product.id === id);
    if (index !== -1) {
      const deletedProduct = this.products[index];
      this.products.splice(index, 1);
      console.log('=== PRODUCT DELETED FROM STORE ===');
      console.log('Product ID:', id);
      console.log('Product Name:', deletedProduct.name);
      console.log('Deleted at:', new Date().toISOString());
      console.log('Products remaining:', this.products.length);
      console.log('===================================');
      this.notifyListeners();
      return true;
    }
    console.log('❌ Product not found for deletion:', id);
    return false;
  }

  // Clear all products (for testing)
  clearProducts() {
    this.products = [];
    console.log('=== ALL PRODUCTS CLEARED ===');
    console.log('Cleared at:', new Date().toISOString());
    console.log('============================');
    this.notifyListeners();
  }

  // Get product count
  getProductCount(): number {
    return this.products.length;
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

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // Load products from backend
  async loadProductsFromBackend(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Loading products from backend...');
      const result = await getProducts();
      
      if (!result.success || !result.products) {
        console.error('❌ Failed to load products:', result.error);
        return { success: false, error: result.error };
      }

      // Clear existing products
      this.products = [];

      // Transform backend products to Product interface format
      const transformedProducts: Product[] = result.products.map((backendProduct: any) => {
        // Get first image from product_images array or use product_image
        // product_images can be an array or a string (JSON string)
        let images: string[] = [];
        if (backendProduct.product_images) {
          if (Array.isArray(backendProduct.product_images)) {
            images = backendProduct.product_images;
          } else if (typeof backendProduct.product_images === 'string') {
            try {
              images = JSON.parse(backendProduct.product_images);
            } catch {
              // If parsing fails, treat as single image URL
              images = [backendProduct.product_images];
            }
          }
        }
        const image = images.length > 0 ? images[0] : (backendProduct.product_image || '');

        // Determine urgency level based on stock
        let urgencyLevel: 'normal' | 'low' | 'critical' = 'normal';
        if (backendProduct.current_stock !== undefined && backendProduct.min_stock_level !== undefined) {
          if (backendProduct.current_stock <= 0) {
            urgencyLevel = 'critical';
          } else if (backendProduct.current_stock <= backendProduct.min_stock_level) {
            urgencyLevel = 'low';
          }
        }

        return {
          id: backendProduct.id,
          name: backendProduct.name || '',
          image: image,
          productImages: images.length > 0 ? images : undefined, // Store all images
          category: backendProduct.category || '',
          currentStock: backendProduct.current_stock || 0,
          minStockLevel: backendProduct.min_stock_level || 0,
          maxStockLevel: backendProduct.max_stock_level || 0,
          openingStock: backendProduct.opening_stock || 0,
          unitPrice: backendProduct.per_unit_price || backendProduct.purchase_price || 0,
          salesPrice: backendProduct.sales_price || 0,
          hsnCode: backendProduct.hsn_code || '',
          barcode: backendProduct.barcode || '',
          taxRate: backendProduct.tax_rate || 0,
          taxInclusive: backendProduct.tax_inclusive || false,
          supplier: backendProduct.preferred_supplier_id || undefined,
          location: backendProduct.storage_location_name || '',
          lastRestocked: backendProduct.last_restocked_at || backendProduct.last_restocked || undefined,
          stockValue: backendProduct.stock_value || undefined,
          primaryUnit: backendProduct.primary_unit || '',
          secondaryUnit: backendProduct.secondary_unit || undefined,
          tertiaryUnit: backendProduct.tertiary_unit || undefined,
          conversionRatio: backendProduct.conversion_ratio || undefined,
          tertiaryConversionRatio: backendProduct.tertiary_conversion_ratio || undefined,
          urgencyLevel: urgencyLevel,
          batchNumber: backendProduct.batch_number || undefined,
          mrp: backendProduct.mrp_price?.toString() || undefined,
          brand: backendProduct.brand || undefined,
          description: backendProduct.description || undefined,
          createdAt: backendProduct.created_at || undefined,
          updatedAt: backendProduct.updated_at || undefined,
          cessType: backendProduct.cess_type || 'none',
          cessRate: backendProduct.cess_rate || 0,
          cessAmount: backendProduct.cess_amount || 0,
          cessUnit: backendProduct.cess_unit || undefined,
        };
      });

      // Add all transformed products to store
      this.products = transformedProducts;
      console.log(`✅ Loaded ${transformedProducts.length} products from backend`);
      this.notifyListeners();
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error loading products from backend:', error);
      return { success: false, error: error.message || 'Failed to load products' };
    }
  }
}

// Create a singleton instance
export const productStore = new ProductStore(); 