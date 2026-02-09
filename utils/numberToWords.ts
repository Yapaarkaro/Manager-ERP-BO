/**
 * Convert number to words in Indian format
 * Example: 123456 -> "One lakh twenty three thousand four hundred and fifty six"
 */

const ones = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];

const tens = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

const convertHundreds = (num: number): string => {
  let result = '';
  
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' hundred';
    num %= 100;
    if (num > 0) {
      result += ' ';
    }
  }
  
  if (num >= 20) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) {
      result += ' ' + ones[num];
    }
  } else if (num > 0) {
    result += ones[num];
  }
  
  return result.trim();
};

const capitalizeFirst = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const numberToWords = (num: number | string): string => {
  // Handle string input
  const numValue = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  
  if (isNaN(numValue) || numValue < 0) {
    return '';
  }
  
  if (numValue === 0) {
    return 'Zero';
  }
  
  // Handle decimal part
  const parts = numValue.toString().split('.');
  const integerPart = Math.floor(numValue);
  const decimalPart = parts[1] ? parseInt(parts[1].padEnd(2, '0').substring(0, 2)) : 0;
  
  let result = '';
  
  // Convert integer part
  if (integerPart >= 10000000) { // Crores
    const crores = Math.floor(integerPart / 10000000);
    result += convertHundreds(crores) + ' crore';
    const remainder = integerPart % 10000000;
    if (remainder > 0) {
      result += ' ';
    }
    const remaining = remainder;
    if (remaining >= 100000) { // Lakhs
      const lakhs = Math.floor(remaining / 100000);
      result += convertHundreds(lakhs) + ' lakh';
      const rem = remaining % 100000;
      if (rem > 0) {
        result += ' ';
      }
      if (rem >= 1000) { // Thousands
        const thousands = Math.floor(rem / 1000);
        result += convertHundreds(thousands) + ' thousand';
        const rem2 = rem % 1000;
        if (rem2 > 0) {
          result += ' ';
        }
        result += convertHundreds(rem2);
      } else {
        result += convertHundreds(rem);
      }
    } else if (remaining >= 1000) { // Thousands
      const thousands = Math.floor(remaining / 1000);
      result += convertHundreds(thousands) + ' thousand';
      const rem = remaining % 1000;
      if (rem > 0) {
        result += ' ';
      }
      result += convertHundreds(rem);
    } else {
      result += convertHundreds(remaining);
    }
  } else if (integerPart >= 100000) { // Lakhs
    const lakhs = Math.floor(integerPart / 100000);
    result += convertHundreds(lakhs) + ' lakh';
    const remainder = integerPart % 100000;
    if (remainder > 0) {
      result += ' ';
    }
    if (remainder >= 1000) { // Thousands
      const thousands = Math.floor(remainder / 1000);
      result += convertHundreds(thousands) + ' thousand';
      const rem = remainder % 1000;
      if (rem > 0) {
        result += ' ';
      }
      result += convertHundreds(rem);
    } else {
      result += convertHundreds(remainder);
    }
  } else if (integerPart >= 1000) { // Thousands
    const thousands = Math.floor(integerPart / 1000);
    result += convertHundreds(thousands) + ' thousand';
    const remainder = integerPart % 1000;
    if (remainder > 0) {
      result += ' ';
    }
    result += convertHundreds(remainder);
  } else {
    result += convertHundreds(integerPart);
  }
  
  // Add "rupees" at the end
  result += ' rupees';
  
  // Handle decimal part (paise)
  if (decimalPart > 0) {
    result += ' and ' + convertHundreds(decimalPart) + ' paise';
  }
  
  // Capitalize first letter
  return capitalizeFirst(result);
};



















