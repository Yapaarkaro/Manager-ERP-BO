// UPI QR Code Generator Utility
// Generates UPI payment URLs according to the UPI standard format

export interface UPIPaymentData {
  payeeVPA: string;          // Payee UPI ID (mandatory)
  payeeName: string;         // Business name (mandatory)
  amount?: number;           // Amount in decimal format (optional but typical)
  currency?: 'INR';          // Currency - always INR (mandatory when amount is present)
  transactionNote?: string;  // Transaction note / invoice number (optional)
  transactionRef?: string;   // Transaction reference/order id (optional)
  invoiceUrl?: string;       // Invoice/receipt URL (optional)
}

export interface UPIQRCodeOptions {
  // QR code generation options
  size?: number;             // QR code size in pixels
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // Error correction level
  margin?: number;           // Margin around QR code
}

/**
 * Formats amount to ensure proper decimal places
 * - Always maintains 2 decimal places for precision
 * - Example: 100.72 stays 100.72, 100.00 stays 100.00
 */
export function formatUPIAmount(amount: number): string {
  // Always show 2 decimal places for precision
  return amount.toFixed(2);
}

/**
 * Validates UPI ID format
 * Format: username@bankname or username@upi
 */
export function validateUPIId(upiId: string): boolean {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
  return upiRegex.test(upiId) && upiId.length >= 5 && upiId.length <= 50;
}

/**
 * Generates UPI payment URL according to standard format
 * Format: upi://pay?pa=<payee-vpa>&pn=<payee-name>&am=<amount>&cu=INR&tn=<note>&tr=<txnRef>&url=<invoiceUrl>
 */
export function generateUPIPaymentURL(data: UPIPaymentData): string {
  if (!data.payeeVPA || !data.payeeName) {
    throw new Error('Payee VPA and Payee Name are mandatory for UPI payments');
  }

  if (!validateUPIId(data.payeeVPA)) {
    throw new Error('Invalid UPI ID format. Please use format: username@bankname');
  }

  // Start with base UPI URL
  let upiUrl = 'upi://pay';
  const params: string[] = [];

  // Mandatory parameters
  params.push(`pa=${encodeURIComponent(data.payeeVPA)}`);
  params.push(`pn=${encodeURIComponent(data.payeeName)}`);

  // Optional but typical amount
  if (data.amount !== undefined && data.amount > 0) {
    const formattedAmount = formatUPIAmount(data.amount);
    params.push(`am=${formattedAmount}`);
    params.push(`cu=INR`); // Currency is mandatory when amount is present
  }

  // Optional parameters
  if (data.transactionNote) {
    params.push(`tn=${encodeURIComponent(data.transactionNote)}`);
  }

  if (data.transactionRef) {
    params.push(`tr=${encodeURIComponent(data.transactionRef)}`);
  }

  if (data.invoiceUrl) {
    params.push(`url=${encodeURIComponent(data.invoiceUrl)}`);
  }

  // Combine URL with parameters
  if (params.length > 0) {
    upiUrl += '?' + params.join('&');
  }

  return upiUrl;
}

/**
 * Generates UPI payment URL for invoice payment
 * Convenience function for invoice-specific UPI payments
 */
export function generateInvoiceUPIURL(
  payeeVPA: string,
  businessName: string,
  invoiceAmount: number,
  invoiceNumber: string,
  invoiceUrl?: string
): string {
  return generateUPIPaymentURL({
    payeeVPA: payeeVPA,
    payeeName: businessName,
    amount: invoiceAmount,
    currency: 'INR',
    transactionNote: `Invoice ${invoiceNumber}`,
    transactionRef: invoiceNumber,
    invoiceUrl: invoiceUrl
  });
}

/**
 * Generates UPI payment URL for general payment
 * Convenience function for general UPI payments
 */
export function generateGeneralUPIURL(
  payeeVPA: string,
  businessName: string,
  amount?: number,
  note?: string
): string {
  return generateUPIPaymentURL({
    payeeVPA: payeeVPA,
    payeeName: businessName,
    amount: amount,
    currency: amount ? 'INR' : undefined,
    transactionNote: note
  });
}

/**
 * Extracts payment information from UPI URL
 * Useful for parsing and validating UPI URLs
 */
export function parseUPIPaymentURL(upiUrl: string): UPIPaymentData | null {
  try {
    const url = new URL(upiUrl);
    
    if (url.protocol !== 'upi:' || url.pathname !== '//pay') {
      return null;
    }

    const params = url.searchParams;
    const payeeVPA = params.get('pa');
    const payeeName = params.get('pn');

    if (!payeeVPA || !payeeName) {
      return null;
    }

    const result: UPIPaymentData = {
      payeeVPA: payeeVPA,
      payeeName: payeeName
    };

    const amount = params.get('am');
    if (amount) {
      result.amount = parseFloat(amount);
      result.currency = 'INR';
    }

    const transactionNote = params.get('tn');
    if (transactionNote) {
      result.transactionNote = transactionNote;
    }

    const transactionRef = params.get('tr');
    if (transactionRef) {
      result.transactionRef = transactionRef;
    }

    const invoiceUrl = params.get('url');
    if (invoiceUrl) {
      result.invoiceUrl = invoiceUrl;
    }

    return result;
  } catch (error) {
    console.error('Error parsing UPI URL:', error);
    return null;
  }
}

/**
 * Validates a complete UPI payment URL
 * Returns validation result with details
 */
export function validateUPIPaymentURL(upiUrl: string): {
  isValid: boolean;
  errors: string[];
  data?: UPIPaymentData;
} {
  const errors: string[] = [];
  
  try {
    const data = parseUPIPaymentURL(upiUrl);
    
    if (!data) {
      errors.push('Invalid UPI URL format');
      return { isValid: false, errors };
    }

    if (!validateUPIId(data.payeeVPA)) {
      errors.push('Invalid UPI ID format');
    }

    if (!data.payeeName || data.payeeName.trim().length === 0) {
      errors.push('Payee name is required');
    }

    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        errors.push('Amount must be greater than 0');
      }
      if (!data.currency || data.currency !== 'INR') {
        errors.push('Currency must be INR when amount is specified');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? data : undefined
    };
  } catch (error) {
    errors.push('Failed to parse UPI URL');
    return { isValid: false, errors };
  }
}

/**
 * Gets formatted display text for UPI payment amount
 * Handles currency formatting for Indian Rupees
 */
export function formatUPIAmountDisplay(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Example usage and logging helper
 */
export function logUPIPaymentExample() {
  console.log('=== UPI Payment URL Examples ===');
  
  // Example 1: Invoice payment
  const invoiceUrl = generateInvoiceUPIURL(
    'business@paytm',
    'ABC Electronics',
    1234.56,
    'INV-2024-001',
    'https://example.com/invoice/INV-2024-001'
  );
  console.log('Invoice Payment URL:', invoiceUrl);
  
  // Example 2: Rounded amount
  const roundedUrl = generateInvoiceUPIURL(
    'business@paytm',
    'ABC Electronics',
    1234.56,
    'INV-2024-002',
    undefined,
    true
  );
  console.log('Rounded Amount URL:', roundedUrl);
  
  // Example 3: General payment
  const generalUrl = generateGeneralUPIURL(
    'business@paytm',
    'ABC Electronics',
    500.00,
    'Service payment'
  );
  console.log('General Payment URL:', generalUrl);
  
  // Example 4: No amount (user enters amount)
  const noAmountUrl = generateGeneralUPIURL(
    'business@paytm',
    'ABC Electronics'
  );
  console.log('No Amount URL:', noAmountUrl);
  
  console.log('================================');
}
