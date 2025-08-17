-- Sample Data for ERP Manager Application
-- This script inserts sample data for testing and development

-- Insert sample business addresses
INSERT INTO business_addresses (name, type, door_number, address_line1, address_line2, city, pincode, state_name, state_code, manager, phone, is_primary, status) VALUES
('Main Office', 'primary', '123', 'Business Park', 'Floor 2', 'Mumbai', '400001', 'Maharashtra', 'MH', 'Rajesh Kumar', '+91-9876543210', true, 'active'),
('Warehouse North', 'warehouse', '456', 'Industrial Area', 'Block A', 'Delhi', '110001', 'Delhi', 'DL', 'Amit Patel', '+91-9876543211', false, 'active'),
('Branch Office', 'branch', '789', 'Commercial Street', 'Suite 101', 'Bangalore', '560001', 'Karnataka', 'KA', 'Priya Sharma', '+91-9876543212', false, 'active');

-- Insert sample customers
INSERT INTO customers (name, business_name, customer_type, contact_person, mobile, email, address, gstin, avatar, customer_score, on_time_payment, satisfaction_rating, response_time, total_orders, completed_orders, total_value, average_order_value, status, payment_terms, credit_limit, categories) VALUES
('John Doe', 'Doe Enterprises', 'business', 'John Doe', '+91-9876543201', 'john@doe.com', '123 Business St, Mumbai, Maharashtra', '27ABCDE1234F1Z5', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', 85, 90, 4, 2, 15, 15, 150000, 10000, 'active', 'Net 30', 50000, ARRAY['electronics', 'office_supplies']),
('Jane Smith', NULL, 'individual', 'Jane Smith', '+91-9876543202', 'jane@smith.com', '456 Personal Ave, Delhi, Delhi', NULL, 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg', 92, 95, 5, 1, 8, 8, 80000, 10000, 'active', 'Cash on Delivery', 10000, ARRAY['electronics', 'accessories']),
('ABC Corporation', 'ABC Corp Ltd', 'business', 'Robert Johnson', '+91-9876543203', 'robert@abc.com', '789 Corporate Blvd, Bangalore, Karnataka', '29ABCDE1234F1Z6', 'https://images.pexels.com/photos/2379006/pexels-photo-2379006.jpeg', 78, 85, 4, 3, 25, 23, 300000, 12000, 'active', 'Net 45', 100000, ARRAY['electronics', 'software', 'services']);

-- Insert sample suppliers
INSERT INTO suppliers (name, business_name, supplier_type, contact_person, mobile, email, address, gstin, avatar, supplier_score, on_time_delivery, quality_rating, response_time, total_orders, completed_orders, total_value, status, payment_terms, delivery_time, categories, product_count) VALUES
('Tech Solutions Inc', 'Tech Solutions India Pvt Ltd', 'business', 'David Wilson', '+91-9876543210', 'david@techsolutions.com', '321 Tech Park, Mumbai, Maharashtra', '27ABCDE1234F1Z7', 'https://images.pexels.com/photos/2379007/pexels-photo-2379007.jpeg', 88, 92, 4, 2, 30, 28, 500000, 'active', 'Net 30', '3-5 days', ARRAY['electronics', 'computers'], 150),
('Quality Electronics', 'Quality Electronics Ltd', 'business', 'Sarah Brown', '+91-9876543211', 'sarah@quality.com', '654 Electronics St, Delhi, Delhi', '07ABCDE1234F1Z8', 'https://images.pexels.com/photos/2379008/pexels-photo-2379008.jpeg', 85, 88, 4, 3, 20, 18, 300000, 'active', 'Net 45', '5-7 days', ARRAY['electronics', 'mobile'], 100),
('Office Supplies Co', 'Office Supplies Company', 'business', 'Michael Davis', '+91-9876543212', 'michael@office.com', '987 Office Ave, Bangalore, Karnataka', '29ABCDE1234F1Z9', 'https://images.pexels.com/photos/2379009/pexels-photo-2379009.jpeg', 82, 85, 4, 4, 15, 14, 200000, 'active', 'Net 30', '2-3 days', ARRAY['office_supplies', 'stationery'], 75);

-- Insert sample products
INSERT INTO products (name, image, category, current_stock, min_stock_level, max_stock_level, unit_price, sales_price, hsn_code, barcode, tax_rate, supplier_id, location_id, stock_value, primary_unit, urgency_level, cess_type, cess_rate, cess_amount) VALUES
('Laptop Dell Inspiron', 'https://images.pexels.com/photos/18105/pexels-photo.jpg', 'electronics', 25, 10, 50, 45000, 50000, '8471', '1234567890123', 18, (SELECT id FROM suppliers WHERE name = 'Tech Solutions Inc' LIMIT 1), (SELECT id FROM business_addresses WHERE name = 'Main Office' LIMIT 1), 1125000, 'piece', 'normal', 'none', 0, 0),
('Wireless Mouse', 'https://images.pexels.com/photos/18105/pexels-photo.jpg', 'electronics', 100, 20, 200, 800, 1000, '8471', '1234567890124', 18, (SELECT id FROM suppliers WHERE name = 'Tech Solutions Inc' LIMIT 1), (SELECT id FROM business_addresses WHERE name = 'Main Office' LIMIT 1), 80000, 'piece', 'normal', 'none', 0, 0),
('Office Chair', 'https://images.pexels.com/photos/18105/pexels-photo.jpg', 'office_supplies', 15, 5, 30, 2500, 3000, '9401', '1234567890125', 18, (SELECT id FROM suppliers WHERE name = 'Office Supplies Co' LIMIT 1), (SELECT id FROM business_addresses WHERE name = 'Main Office' LIMIT 1), 37500, 'piece', 'normal', 'none', 0, 0),
('Printer Paper A4', 'https://images.pexels.com/photos/18105/pexels-photo.jpg', 'office_supplies', 200, 50, 500, 300, 400, '4802', '1234567890126', 18, (SELECT id FROM suppliers WHERE name = 'Office Supplies Co' LIMIT 1), (SELECT id FROM business_addresses WHERE name = 'Main Office' LIMIT 1), 60000, 'ream', 'normal', 'none', 0, 0),
('Smartphone Samsung', 'https://images.pexels.com/photos/18105/pexels-photo.jpg', 'electronics', 30, 10, 60, 15000, 18000, '8517', '1234567890127', 18, (SELECT id FROM suppliers WHERE name = 'Quality Electronics' LIMIT 1), (SELECT id FROM business_addresses WHERE name = 'Main Office' LIMIT 1), 450000, 'piece', 'normal', 'none', 0, 0);

-- Insert sample staff
INSERT INTO staff (name, email, mobile, role, avatar, status) VALUES
('Rajesh Kumar', 'rajesh@company.com', '+91-9876543200', 'Manager', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', 'active'),
('Priya Sharma', 'priya@company.com', '+91-9876543201', 'Sales Executive', 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg', 'active'),
('Amit Patel', 'amit@company.com', '+91-9876543202', 'Warehouse Manager', 'https://images.pexels.com/photos/2379006/pexels-photo-2379006.jpeg', 'active');

-- Insert sample sales
INSERT INTO sales (invoice_number, customer_id, customer_name, customer_type, subtotal, tax_amount, cess_amount, total_amount, paid_amount, balance_amount, payment_method, sale_date, status, notes) VALUES
('INV-2024-001', (SELECT id FROM customers WHERE name = 'John Doe' LIMIT 1), 'John Doe', 'business', 50000, 9000, 0, 59000, 59000, 0, 'card', '2024-01-15 10:30:00+05:30', 'completed', 'First order from Doe Enterprises'),
('INV-2024-002', (SELECT id FROM customers WHERE name = 'Jane Smith' LIMIT 1), 'Jane Smith', 'individual', 18000, 3240, 0, 21240, 21240, 0, 'upi', '2024-01-16 14:20:00+05:30', 'completed', 'Individual customer purchase'),
('INV-2024-003', (SELECT id FROM customers WHERE name = 'ABC Corporation' LIMIT 1), 'ABC Corporation', 'business', 120000, 21600, 0, 141600, 100000, 41600, 'bank_transfer', '2024-01-17 09:15:00+05:30', 'pending', 'Large corporate order - partial payment');

-- Insert sample sale items
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price, tax_rate, tax_amount, hsn_code, primary_unit) VALUES
((SELECT id FROM sales WHERE invoice_number = 'INV-2024-001' LIMIT 1), (SELECT id FROM products WHERE name = 'Laptop Dell Inspiron' LIMIT 1), 'Laptop Dell Inspiron', 1, 50000, 50000, 18, 9000, '8471', 'piece'),
((SELECT id FROM sales WHERE invoice_number = 'INV-2024-002' LIMIT 1), (SELECT id FROM products WHERE name = 'Smartphone Samsung' LIMIT 1), 'Smartphone Samsung', 1, 18000, 18000, 18, 3240, '8517', 'piece'),
((SELECT id FROM sales WHERE invoice_number = 'INV-2024-003' LIMIT 1), (SELECT id FROM products WHERE name = 'Laptop Dell Inspiron' LIMIT 1), 'Laptop Dell Inspiron', 2, 50000, 100000, 18, 18000, '8471', 'piece'),
((SELECT id FROM sales WHERE invoice_number = 'INV-2024-003' LIMIT 1), (SELECT id FROM products WHERE name = 'Office Chair' LIMIT 1), 'Office Chair', 5, 3000, 15000, 18, 2700, '9401', 'piece'),
((SELECT id FROM sales WHERE invoice_number = 'INV-2024-003' LIMIT 1), (SELECT id FROM products WHERE name = 'Printer Paper A4' LIMIT 1), 'Printer Paper A4', 10, 400, 4000, 18, 720, '4802', 'ream');

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_id, supplier_name, supplier_type, business_name, gstin, staff_name, staff_avatar, status, type, amount, item_count, order_date, expected_delivery, supplier_avatar, terms, notes) VALUES
('PO-2024-001', (SELECT id FROM suppliers WHERE name = 'Tech Solutions Inc' LIMIT 1), 'Tech Solutions Inc', 'business', 'Tech Solutions India Pvt Ltd', '27ABCDE1234F1Z7', 'Rajesh Kumar', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', 'confirmed', 'created', 100000, 2, '2024-01-10 11:00:00+05:30', '2024-01-20 00:00:00+05:30', 'https://images.pexels.com/photos/2379007/pexels-photo-2379007.jpeg', 'Net 30', 'Regular laptop order'),
('PO-2024-002', (SELECT id FROM suppliers WHERE name = 'Quality Electronics' LIMIT 1), 'Quality Electronics', 'business', 'Quality Electronics Ltd', '07ABCDE1234F1Z8', 'Priya Sharma', 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg', 'sent', 'created', 50000, 3, '2024-01-12 15:30:00+05:30', '2024-01-25 00:00:00+05:30', 'https://images.pexels.com/photos/2379008/pexels-photo-2379008.jpeg', 'Net 45', 'Smartphone order for Q1');

-- Insert sample PO items
INSERT INTO po_items (po_id, product_id, name, quantity, price, total) VALUES
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-001' LIMIT 1), (SELECT id FROM products WHERE name = 'Laptop Dell Inspiron' LIMIT 1), 'Laptop Dell Inspiron', 2, 45000, 90000),
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-001' LIMIT 1), (SELECT id FROM products WHERE name = 'Wireless Mouse' LIMIT 1), 'Wireless Mouse', 10, 800, 8000),
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-002' LIMIT 1), (SELECT id FROM products WHERE name = 'Smartphone Samsung' LIMIT 1), 'Smartphone Samsung', 3, 15000, 45000),
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-002' LIMIT 1), (SELECT id FROM products WHERE name = 'Wireless Mouse' LIMIT 1), 'Wireless Mouse', 5, 800, 4000);

-- Insert sample expenses
INSERT INTO expenses (type, amount, payment_method, notes, expense_date) VALUES
('rent', 50000, 'Bank Transfer', 'Office rent for January 2024', '2024-01-01 00:00:00+05:30'),
('utilities', 15000, 'UPI', 'Electricity and internet bills', '2024-01-05 00:00:00+05:30'),
('office_supplies', 8000, 'Cash', 'Stationery and office supplies', '2024-01-10 00:00:00+05:30'),
('marketing', 25000, 'Card', 'Digital marketing campaign', '2024-01-15 00:00:00+05:30');

-- Insert sample marketing campaigns
INSERT INTO marketing_campaigns (name, platform, start_date, end_date, budget, status, target_audience, objective, impressions, clicks, conversions, spend) VALUES
('Q1 Electronics Sale', 'Google Ads', '2024-01-01', '2024-03-31', 50000, 'active', ARRAY['business_owners', 'tech_enthusiasts'], 'Increase sales by 25%', 50000, 2500, 125, 15000),
('Office Supplies Promotion', 'Facebook', '2024-01-15', '2024-02-15', 25000, 'active', ARRAY['office_managers', 'small_business'], 'Boost office supplies sales', 30000, 1800, 90, 12000),
('Summer Tech Sale', 'Instagram', '2024-06-01', '2024-08-31', 75000, 'pending', ARRAY['students', 'young_professionals'], 'Clear summer inventory', 0, 0, 0, 0);

-- Insert sample returns
INSERT INTO returns (return_number, original_invoice_number, customer_id, customer_name, customer_type, staff_name, staff_avatar, refund_status, amount, item_count, return_date, reason) VALUES
('RET-2024-001', 'INV-2024-001', (SELECT id FROM customers WHERE name = 'John Doe' LIMIT 1), 'John Doe', 'business', 'Priya Sharma', 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg', 'refunded', 59000, 1, '2024-01-18 16:00:00+05:30', 'Product defect - laptop not working properly'),
('RET-2024-002', 'INV-2024-002', (SELECT id FROM customers WHERE name = 'Jane Smith' LIMIT 1), 'Jane Smith', 'individual', 'Rajesh Kumar', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', 'pending', 21240, 1, '2024-01-19 10:30:00+05:30', 'Wrong color received');

-- Insert sample return items
INSERT INTO return_items (return_id, product_id, name, quantity, rate, amount, tax_rate, tax_amount, total, reason) VALUES
((SELECT id FROM returns WHERE return_number = 'RET-2024-001' LIMIT 1), (SELECT id FROM products WHERE name = 'Laptop Dell Inspiron' LIMIT 1), 'Laptop Dell Inspiron', 1, 50000, 50000, 18, 9000, 59000, 'Product defect - laptop not working properly'),
((SELECT id FROM returns WHERE return_number = 'RET-2024-002' LIMIT 1), (SELECT id FROM products WHERE name = 'Smartphone Samsung' LIMIT 1), 'Smartphone Samsung', 1, 18000, 18000, 18, 3240, 21240, 'Wrong color received');

-- Insert sample stock movements
INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes) VALUES
((SELECT id FROM products WHERE name = 'Laptop Dell Inspiron' LIMIT 1), 'in', 10, 15, 25, 'purchase', (SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-001' LIMIT 1), 'Initial stock from PO-2024-001'),
((SELECT id FROM products WHERE name = 'Wireless Mouse' LIMIT 1), 'in', 20, 80, 100, 'purchase', (SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-001' LIMIT 1), 'Stock addition from PO-2024-001'),
((SELECT id FROM products WHERE name = 'Laptop Dell Inspiron' LIMIT 1), 'out', 1, 25, 24, 'sale', (SELECT id FROM sales WHERE invoice_number = 'INV-2024-001' LIMIT 1), 'Sale to John Doe'),
((SELECT id FROM products WHERE name = 'Smartphone Samsung' LIMIT 1), 'out', 1, 30, 29, 'sale', (SELECT id FROM sales WHERE invoice_number = 'INV-2024-002' LIMIT 1), 'Sale to Jane Smith'),
((SELECT id FROM products WHERE name = 'Laptop Dell Inspiron' LIMIT 1), 'out', 2, 24, 22, 'sale', (SELECT id FROM sales WHERE invoice_number = 'INV-2024-003' LIMIT 1), 'Sale to ABC Corporation'),
((SELECT id FROM products WHERE name = 'Office Chair' LIMIT 1), 'out', 5, 15, 10, 'sale', (SELECT id FROM sales WHERE invoice_number = 'INV-2024-003' LIMIT 1), 'Sale to ABC Corporation'),
((SELECT id FROM products WHERE name = 'Printer Paper A4' LIMIT 1), 'out', 10, 200, 190, 'sale', (SELECT id FROM sales WHERE invoice_number = 'INV-2024-003' LIMIT 1), 'Sale to ABC Corporation');

-- Insert sample stock discrepancies
INSERT INTO stock_discrepancies (product_id, expected_stock, actual_stock, discrepancy_amount, discrepancy_type, reason, status) VALUES
((SELECT id FROM products WHERE name = 'Wireless Mouse' LIMIT 1), 100, 98, 2, 'shortage', 'Found 2 damaged during quality check', 'resolved'),
((SELECT id FROM products WHERE name = 'Office Chair' LIMIT 1), 10, 12, 2, 'excess', 'Found 2 extra chairs in warehouse', 'investigating');

-- Update product stock values
UPDATE products SET stock_value = current_stock * unit_price;

-- Update customer statistics
UPDATE customers SET 
  total_orders = (
    SELECT COUNT(*) FROM sales WHERE customer_id = customers.id
  ),
  completed_orders = (
    SELECT COUNT(*) FROM sales WHERE customer_id = customers.id AND status = 'completed'
  ),
  total_value = (
    SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE customer_id = customers.id
  ),
  average_order_value = (
    SELECT COALESCE(AVG(total_amount), 0) FROM sales WHERE customer_id = customers.id
  );

-- Update supplier statistics
UPDATE suppliers SET 
  total_orders = (
    SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = suppliers.id
  ),
  completed_orders = (
    SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = suppliers.id AND status = 'received'
  ),
  total_value = (
    SELECT COALESCE(SUM(amount), 0) FROM purchase_orders WHERE supplier_id = suppliers.id
  );

-- Create sample receivables
INSERT INTO receivables (customer_id, customer_name, customer_type, business_name, gstin, mobile, email, address, total_receivable, overdue_amount, invoice_count, oldest_invoice_date, days_past_due, credit_limit, payment_terms, customer_avatar, status) VALUES
((SELECT id FROM customers WHERE name = 'ABC Corporation' LIMIT 1), 'ABC Corporation', 'business', 'ABC Corp Ltd', '29ABCDE1234F1Z6', '+91-9876543203', 'robert@abc.com', '789 Corporate Blvd, Bangalore, Karnataka', 41600, 41600, 1, '2024-01-17 09:15:00+05:30', 2, 100000, 'Net 45', 'https://images.pexels.com/photos/2379006/pexels-photo-2379006.jpeg', 'current');

-- Create sample payables
INSERT INTO payables (supplier_id, supplier_name, supplier_type, business_name, gstin, mobile, email, address, total_payable, overdue_amount, bill_count, oldest_bill_date, days_past_due, credit_limit, payment_terms, supplier_avatar, status) VALUES
((SELECT id FROM suppliers WHERE name = 'Tech Solutions Inc' LIMIT 1), 'Tech Solutions Inc', 'business', 'Tech Solutions India Pvt Ltd', '27ABCDE1234F1Z7', '+91-9876543210', 'david@techsolutions.com', '321 Tech Park, Mumbai, Maharashtra', 100000, 0, 1, '2024-01-10 11:00:00+05:30', 0, 200000, 'Net 30', 'https://images.pexels.com/photos/2379007/pexels-photo-2379007.jpeg', 'current'),
((SELECT id FROM suppliers WHERE name = 'Quality Electronics' LIMIT 1), 'Quality Electronics', 'business', 'Quality Electronics Ltd', '07ABCDE1234F1Z8', '+91-9876543211', 'sarah@quality.com', '654 Electronics St, Delhi, Delhi', 50000, 0, 1, '2024-01-12 15:30:00+05:30', 0, 150000, 'Net 45', 'https://images.pexels.com/photos/2379008/pexels-photo-2379008.jpeg', 'current');

-- Create sample invoices from sales
INSERT INTO invoices (invoice_number, customer_id, customer_name, customer_type, subtotal, tax_amount, cess_amount, total_amount, paid_amount, balance_amount, payment_method, invoice_date, due_date, status, notes) VALUES
('INV-2024-001', (SELECT id FROM customers WHERE name = 'John Doe' LIMIT 1), 'John Doe', 'business', 50000, 9000, 0, 59000, 59000, 0, 'card', '2024-01-15 10:30:00+05:30', '2024-01-15 10:30:00+05:30', 'paid', 'First order from Doe Enterprises'),
('INV-2024-002', (SELECT id FROM customers WHERE name = 'Jane Smith' LIMIT 1), 'Jane Smith', 'individual', 18000, 3240, 0, 21240, 21240, 0, 'upi', '2024-01-16 14:20:00+05:30', '2024-01-16 14:20:00+05:30', 'paid', 'Individual customer purchase'),
('INV-2024-003', (SELECT id FROM customers WHERE name = 'ABC Corporation' LIMIT 1), 'ABC Corporation', 'business', 119000, 21420, 0, 140420, 100000, 40420, 'bank_transfer', '2024-01-17 09:15:00+05:30', '2024-03-02 09:15:00+05:30', 'partial', 'Large corporate order - partial payment');

-- Create sample invoice items
INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price, tax_rate, tax_amount, hsn_code, primary_unit) VALUES
((SELECT id FROM invoices WHERE invoice_number = 'INV-2024-001' LIMIT 1), (SELECT id FROM products WHERE name = 'Laptop Dell Inspiron' LIMIT 1), 'Laptop Dell Inspiron', 1, 50000, 50000, 18, 9000, '8471', 'piece'),
((SELECT id FROM invoices WHERE invoice_number = 'INV-2024-002' LIMIT 1), (SELECT id FROM products WHERE name = 'Smartphone Samsung' LIMIT 1), 'Smartphone Samsung', 1, 18000, 18000, 18, 3240, '8517', 'piece'),
((SELECT id FROM invoices WHERE invoice_number = 'INV-2024-003' LIMIT 1), (SELECT id FROM products WHERE name = 'Laptop Dell Inspiron' LIMIT 1), 'Laptop Dell Inspiron', 2, 50000, 100000, 18, 18000, '8471', 'piece'),
((SELECT id FROM invoices WHERE invoice_number = 'INV-2024-003' LIMIT 1), (SELECT id FROM products WHERE name = 'Office Chair' LIMIT 1), 'Office Chair', 5, 3000, 15000, 18, 2700, '9401', 'piece'),
((SELECT id FROM invoices WHERE invoice_number = 'INV-2024-003' LIMIT 1), (SELECT id FROM products WHERE name = 'Printer Paper A4' LIMIT 1), 'Printer Paper A4', 10, 400, 4000, 18, 720, '4802', 'ream');

-- Update customer return counts
UPDATE customers SET 
  returned_orders = (
    SELECT COUNT(*) FROM returns WHERE customer_id = customers.id
  );

-- Update product counts for suppliers
UPDATE suppliers SET 
  product_count = (
    SELECT COUNT(*) FROM products WHERE supplier_id = suppliers.id
  );

-- Update last order dates
UPDATE customers SET 
  last_order_date = (
    SELECT MAX(sale_date) FROM sales WHERE customer_id = customers.id
  );

UPDATE suppliers SET 
  last_order_date = (
    SELECT MAX(order_date) FROM purchase_orders WHERE supplier_id = suppliers.id
  );

-- Update last restocked dates for products
UPDATE products SET 
  last_restocked = (
    SELECT MAX(created_at) FROM stock_movements 
    WHERE product_id = products.id AND movement_type = 'in'
  );

-- Update urgency levels based on stock
UPDATE products SET 
  urgency_level = CASE 
    WHEN current_stock <= min_stock_level THEN 'critical'
    WHEN current_stock <= (min_stock_level + (max_stock_level - min_stock_level) * 0.3) THEN 'low'
    ELSE 'normal'
  END;

-- Update return rate for customers
UPDATE customers SET 
  return_rate = CASE 
    WHEN total_orders > 0 THEN (returned_orders::DECIMAL / total_orders) * 100
    ELSE 0
  END;

-- Update customer scores based on performance
UPDATE customers SET 
  customer_score = (
    (on_time_payment * 0.4) + 
    (satisfaction_rating * 20) + 
    (CASE WHEN response_time <= 1 THEN 100 WHEN response_time <= 2 THEN 80 WHEN response_time <= 3 THEN 60 ELSE 40 END * 0.4)
  );

-- Update supplier scores based on performance
UPDATE suppliers SET 
  supplier_score = (
    (on_time_delivery * 0.4) + 
    (quality_rating * 20) + 
    (CASE WHEN response_time <= 1 THEN 100 WHEN response_time <= 2 THEN 80 WHEN response_time <= 3 THEN 60 ELSE 40 END * 0.4)
  );

-- Update days past due for receivables
UPDATE receivables SET 
  days_past_due = EXTRACT(DAY FROM (NOW() - oldest_invoice_date::timestamp));

-- Update status based on days past due
UPDATE receivables SET 
  status = CASE 
    WHEN days_past_due > 90 THEN 'critical'
    WHEN days_past_due > 30 THEN 'overdue'
    ELSE 'current'
  END;

UPDATE payables SET 
  status = CASE 
    WHEN days_past_due > 90 THEN 'critical'
    WHEN days_past_due > 30 THEN 'overdue'
    ELSE 'current'
  END;

-- Update overdue amounts
UPDATE receivables SET 
  overdue_amount = CASE 
    WHEN days_past_due > 30 THEN total_receivable
    ELSE 0
  END;

UPDATE payables SET 
  overdue_amount = CASE 
    WHEN days_past_due > 30 THEN total_payable
    ELSE 0
  END;

-- Update stock values
UPDATE products SET 
  stock_value = current_stock * unit_price;

-- Update average order values
UPDATE customers SET 
  average_order_value = CASE 
    WHEN total_orders > 0 THEN total_value / total_orders
    ELSE 0
  END;

-- Update supplier product counts
UPDATE suppliers SET 
  product_count = (
    SELECT COUNT(*) FROM products WHERE supplier_id = suppliers.id
  );

-- Update customer categories based on purchase history
UPDATE customers SET 
  categories = ARRAY(
    SELECT DISTINCT p.category 
    FROM sales s 
    JOIN sale_items si ON s.id = si.sale_id 
    JOIN products p ON si.product_id = p.id 
    WHERE s.customer_id = customers.id
  );

-- Update supplier categories based on product offerings
UPDATE suppliers SET 
  categories = ARRAY(
    SELECT DISTINCT category 
    FROM products 
    WHERE supplier_id = suppliers.id
  );

-- Update business address primary status
UPDATE business_addresses SET 
  is_primary = (name = 'Main Office');

-- Update business address status
UPDATE business_addresses SET 
  status = 'active';

-- Update staff status
UPDATE staff SET 
  status = 'active';

-- Update expense dates
UPDATE expenses SET 
  expense_date = created_at;

-- Update marketing campaign dates
UPDATE marketing_campaigns SET 
  start_date = start_date::date,
  end_date = end_date::date;

-- Update return dates
UPDATE returns SET 
  return_date = created_at;

-- Update stock movement dates
UPDATE stock_movements SET 
  created_at = NOW();

-- Update stock discrepancy dates
UPDATE stock_discrepancies SET 
  created_at = NOW();

-- Update all updated_at timestamps
UPDATE business_addresses SET updated_at = NOW();
UPDATE customers SET updated_at = NOW();
UPDATE suppliers SET updated_at = NOW();
UPDATE products SET updated_at = NOW();
UPDATE sales SET updated_at = NOW();
UPDATE invoices SET updated_at = NOW();
UPDATE purchase_orders SET updated_at = NOW();
UPDATE purchase_invoices SET updated_at = NOW();
UPDATE receivables SET updated_at = NOW();
UPDATE payables SET updated_at = NOW();
UPDATE expenses SET updated_at = NOW();
UPDATE marketing_campaigns SET updated_at = NOW();
UPDATE returns SET updated_at = NOW();
UPDATE staff SET updated_at = NOW();
UPDATE stock_discrepancies SET updated_at = NOW();

-- Display summary
SELECT 'Sample data inserted successfully!' as message;
SELECT 'Total records created:' as summary;
SELECT 'Business Addresses: ' || COUNT(*) as count FROM business_addresses
UNION ALL
SELECT 'Customers: ' || COUNT(*) as count FROM customers
UNION ALL
SELECT 'Suppliers: ' || COUNT(*) as count FROM suppliers
UNION ALL
SELECT 'Products: ' || COUNT(*) as count FROM products
UNION ALL
SELECT 'Sales: ' || COUNT(*) as count FROM sales
UNION ALL
SELECT 'Sale Items: ' || COUNT(*) as count FROM sale_items
UNION ALL
SELECT 'Invoices: ' || COUNT(*) as count FROM invoices
UNION ALL
SELECT 'Invoice Items: ' || COUNT(*) as count FROM invoice_items
UNION ALL
SELECT 'Purchase Orders: ' || COUNT(*) as count FROM purchase_orders
UNION ALL
SELECT 'PO Items: ' || COUNT(*) as count FROM po_items
UNION ALL
SELECT 'Expenses: ' || COUNT(*) as count FROM expenses
UNION ALL
SELECT 'Marketing Campaigns: ' || COUNT(*) as count FROM marketing_campaigns
UNION ALL
SELECT 'Returns: ' || COUNT(*) as count FROM returns
UNION ALL
SELECT 'Return Items: ' || COUNT(*) as count FROM return_items
UNION ALL
SELECT 'Staff: ' || COUNT(*) as count FROM staff
UNION ALL
SELECT 'Stock Movements: ' || COUNT(*) as count FROM stock_movements
UNION ALL
SELECT 'Stock Discrepancies: ' || COUNT(*) as count FROM stock_discrepancies
UNION ALL
SELECT 'Receivables: ' || COUNT(*) as count FROM receivables
UNION ALL
SELECT 'Payables: ' || COUNT(*) as count FROM payables; 