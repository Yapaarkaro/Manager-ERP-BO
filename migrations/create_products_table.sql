-- Create products table with all product details
-- This table stores all inventory items with comprehensive information

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Basic Information
  name TEXT NOT NULL,
  category TEXT,
  custom_category TEXT,
  hsn_code TEXT,
  barcode TEXT,
  product_image TEXT, -- URL or base64
  
  -- Advanced Options
  show_advanced_options BOOLEAN DEFAULT false,
  batch_number TEXT,
  expiry_date TIMESTAMPTZ,
  
  -- Unit of Measurement (UoM)
  use_compound_unit BOOLEAN DEFAULT false,
  unit_type TEXT, -- 'simple' | 'compound'
  primary_unit TEXT NOT NULL DEFAULT 'Piece',
  secondary_unit TEXT,
  tertiary_unit TEXT,
  conversion_ratio TEXT, -- JSON string or text representation
  tertiary_conversion_ratio TEXT,
  price_unit TEXT DEFAULT 'primary', -- 'primary' | 'secondary'
  stock_uom TEXT DEFAULT 'primary', -- 'primary' | 'secondary' | 'tertiary'
  
  -- Tax Information
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_inclusive BOOLEAN DEFAULT false, -- true if price includes tax
  cess_type TEXT DEFAULT 'none', -- 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp'
  cess_rate DECIMAL(5,2) DEFAULT 0,
  cess_amount DECIMAL(10,2) DEFAULT 0,
  cess_unit TEXT,
  
  -- Stock Management
  opening_stock DECIMAL(12,3) DEFAULT 0,
  current_stock DECIMAL(12,3) DEFAULT 0, -- Calculated from stock transactions
  min_stock_level DECIMAL(12,3) DEFAULT 0,
  max_stock_level DECIMAL(12,3) DEFAULT 0,
  stock_unit TEXT DEFAULT 'primary', -- UoM for stock tracking
  
  -- Pricing
  per_unit_price DECIMAL(12,2) DEFAULT 0,
  purchase_price DECIMAL(12,2) DEFAULT 0,
  sales_price DECIMAL(12,2) DEFAULT 0,
  mrp_price DECIMAL(12,2) DEFAULT 0,
  
  -- Supplier and Location
  preferred_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  storage_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  storage_location_name TEXT, -- Denormalized for quick access
  
  -- Metadata
  brand TEXT,
  description TEXT,
  urgency_level TEXT DEFAULT 'normal', -- 'normal' | 'low' | 'critical'
  stock_value DECIMAL(12,2) DEFAULT 0, -- Calculated: current_stock * per_unit_price
  last_restocked_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT products_name_check CHECK (char_length(name) > 0),
  CONSTRAINT products_tax_rate_check CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT products_cess_rate_check CHECK (cess_rate >= 0 AND cess_rate <= 100),
  CONSTRAINT products_stock_check CHECK (current_stock >= 0),
  CONSTRAINT products_price_check CHECK (per_unit_price >= 0 AND sales_price >= 0 AND mrp_price >= 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_hsn_code ON public.products(hsn_code) WHERE hsn_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_preferred_supplier ON public.products(preferred_supplier_id) WHERE preferred_supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_storage_location ON public.products(storage_location_id) WHERE storage_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_current_stock ON public.products(current_stock);
CREATE INDEX IF NOT EXISTS idx_products_min_stock_level ON public.products(min_stock_level);
CREATE INDEX IF NOT EXISTS idx_products_urgency_level ON public.products(urgency_level);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at DESC);

-- Index for low stock queries (products where current_stock <= min_stock_level)
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON public.products(business_id, current_stock, min_stock_level) 
  WHERE current_stock <= min_stock_level AND min_stock_level > 0;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Function to calculate urgency level based on stock
CREATE OR REPLACE FUNCTION calculate_product_urgency_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate urgency level based on current stock vs min stock level
  IF NEW.min_stock_level > 0 THEN
    IF NEW.current_stock <= 0 THEN
      NEW.urgency_level = 'critical';
    ELSIF NEW.current_stock <= (NEW.min_stock_level * 0.5) THEN
      NEW.urgency_level = 'critical';
    ELSIF NEW.current_stock <= NEW.min_stock_level THEN
      NEW.urgency_level = 'low';
    ELSE
      NEW.urgency_level = 'normal';
    END IF;
  ELSE
    NEW.urgency_level = 'normal';
  END IF;
  
  -- Calculate stock value
  NEW.stock_value = NEW.current_stock * NEW.per_unit_price;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_product_urgency_level
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION calculate_product_urgency_level();

-- Add comments
COMMENT ON TABLE public.products IS 'Stores all inventory products with comprehensive details';
COMMENT ON COLUMN public.products.tax_inclusive IS 'true if entered price includes tax, false if tax is added on top';
COMMENT ON COLUMN public.products.current_stock IS 'Current stock level, calculated from stock transactions';
COMMENT ON COLUMN public.products.urgency_level IS 'Automatically calculated: normal, low, or critical based on stock levels';
COMMENT ON COLUMN public.products.stock_value IS 'Calculated value: current_stock * per_unit_price';

