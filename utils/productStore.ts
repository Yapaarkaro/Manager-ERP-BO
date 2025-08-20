// Simple global product store for the ERP app
// In a real app, this would be replaced with proper state management like Redux or Context API

export interface Product {
  id: string;
  name: string;
  image: string;
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
}

// Create a singleton instance
export const productStore = new ProductStore(); 