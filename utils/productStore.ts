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
  unitPrice: number;
  salesPrice: number;
  hsnCode: string;
  barcode: string;
  taxRate: number;
  supplier: string;
  location: string;
  lastRestocked: string;
  stockValue: number;
  primaryUnit: string;
  secondaryUnit?: string;
  urgencyLevel: 'normal' | 'low' | 'critical';
  batchNumber?: string;
  // CESS fields
  cessType?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
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

  // Search products
  searchProducts(query: string): Product[] {
    const lowercaseQuery = query.toLowerCase();
    return this.products.filter(product =>
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.category.toLowerCase().includes(lowercaseQuery) ||
      product.supplier.toLowerCase().includes(lowercaseQuery) ||
      product.hsnCode.includes(query) ||
      product.barcode.includes(query)
    );
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