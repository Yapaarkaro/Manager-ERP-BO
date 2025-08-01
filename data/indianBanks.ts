export interface IndianBank {
  id: string;
  name: string;
  shortName: string;
  ifscPrefix: string;
  accountNumberLength: number[];
  accountNumberFormat: string;
  category: 'public' | 'private' | 'cooperative' | 'foreign' | 'regional';
}

export const indianBanks: IndianBank[] = [
  // Public Sector Banks
  {
    id: 'sbi',
    name: 'State Bank of India',
    shortName: 'SBI',
    ifscPrefix: 'SBIN',
    accountNumberLength: [11, 17],
    accountNumberFormat: '11 or 17 digits',
    category: 'public'
  },
  {
    id: 'pnb',
    name: 'Punjab National Bank',
    shortName: 'PNB',
    ifscPrefix: 'PUNB',
    accountNumberLength: [13, 16],
    accountNumberFormat: '13-16 digits',
    category: 'public'
  },
  {
    id: 'boi',
    name: 'Bank of India',
    shortName: 'BOI',
    ifscPrefix: 'BKID',
    accountNumberLength: [15],
    accountNumberFormat: '15 digits',
    category: 'public'
  },
  {
    id: 'bob',
    name: 'Bank of Baroda',
    shortName: 'BOB',
    ifscPrefix: 'BARB',
    accountNumberLength: [14],
    accountNumberFormat: '14 digits',
    category: 'public'
  },
  {
    id: 'canara',
    name: 'Canara Bank',
    shortName: 'Canara',
    ifscPrefix: 'CNRB',
    accountNumberLength: [13, 16],
    accountNumberFormat: '13-16 digits',
    category: 'public'
  },
  {
    id: 'union',
    name: 'Union Bank of India',
    shortName: 'Union Bank',
    ifscPrefix: 'UBIN',
    accountNumberLength: [11, 15],
    accountNumberFormat: '11-15 digits',
    category: 'public'
  },
  {
    id: 'indian',
    name: 'Indian Bank',
    shortName: 'Indian Bank',
    ifscPrefix: 'IDIB',
    accountNumberLength: [13, 15],
    accountNumberFormat: '13-15 digits',
    category: 'public'
  },
  {
    id: 'iob',
    name: 'Indian Overseas Bank',
    shortName: 'IOB',
    ifscPrefix: 'IOBA',
    accountNumberLength: [13, 15],
    accountNumberFormat: '13-15 digits',
    category: 'public'
  },
  {
    id: 'uco',
    name: 'UCO Bank',
    shortName: 'UCO',
    ifscPrefix: 'UCBA',
    accountNumberLength: [13],
    accountNumberFormat: '13 digits',
    category: 'public'
  },
  {
    id: 'bom',
    name: 'Bank of Maharashtra',
    shortName: 'BOM',
    ifscPrefix: 'MAHB',
    accountNumberLength: [16],
    accountNumberFormat: '16 digits',
    category: 'public'
  },
  {
    id: 'psb',
    name: 'Punjab & Sind Bank',
    shortName: 'P&S Bank',
    ifscPrefix: 'PSIB',
    accountNumberLength: [14],
    accountNumberFormat: '14 digits',
    category: 'public'
  },
  {
    id: 'central',
    name: 'Central Bank of India',
    shortName: 'Central Bank',
    ifscPrefix: 'CBIN',
    accountNumberLength: [10],
    accountNumberFormat: '10 digits',
    category: 'public'
  },

  // Private Sector Banks
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    shortName: 'HDFC',
    ifscPrefix: 'HDFC',
    accountNumberLength: [14],
    accountNumberFormat: '14 digits',
    category: 'private'
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    shortName: 'ICICI',
    ifscPrefix: 'ICIC',
    accountNumberLength: [12],
    accountNumberFormat: '12 digits',
    category: 'private'
  },
  {
    id: 'axis',
    name: 'Axis Bank',
    shortName: 'Axis',
    ifscPrefix: 'UTIB',
    accountNumberLength: [12, 15, 16, 17, 18],
    accountNumberFormat: '12-18 digits',
    category: 'private'
  },
  {
    id: 'kotak',
    name: 'Kotak Mahindra Bank',
    shortName: 'Kotak',
    ifscPrefix: 'KKBK',
    accountNumberLength: [10, 16],
    accountNumberFormat: '10 or 16 digits',
    category: 'private'
  },
  {
    id: 'indusind',
    name: 'IndusInd Bank',
    shortName: 'IndusInd',
    ifscPrefix: 'INDB',
    accountNumberLength: [12, 15, 16],
    accountNumberFormat: '12-16 digits',
    category: 'private'
  },
  {
    id: 'yes',
    name: 'YES Bank',
    shortName: 'YES',
    ifscPrefix: 'YESB',
    accountNumberLength: [15, 18],
    accountNumberFormat: '15-18 digits',
    category: 'private'
  },
  {
    id: 'idfc',
    name: 'IDFC FIRST Bank',
    shortName: 'IDFC FIRST',
    ifscPrefix: 'IDFB',
    accountNumberLength: [10, 19],
    accountNumberFormat: '10 or 19 digits',
    category: 'private'
  },
  {
    id: 'federal',
    name: 'Federal Bank',
    shortName: 'Federal',
    ifscPrefix: 'FDRL',
    accountNumberLength: [13, 14],
    accountNumberFormat: '13-14 digits',
    category: 'private'
  },
  {
    id: 'rbl',
    name: 'RBL Bank',
    shortName: 'RBL',
    ifscPrefix: 'RATN',
    accountNumberLength: [14, 15, 16],
    accountNumberFormat: '14-16 digits',
    category: 'private'
  },
  {
    id: 'karur',
    name: 'Karur Vysya Bank',
    shortName: 'KVB',
    ifscPrefix: 'KVBL',
    accountNumberLength: [16],
    accountNumberFormat: '16 digits',
    category: 'private'
  },
  {
    id: 'south',
    name: 'South Indian Bank',
    shortName: 'SIB',
    ifscPrefix: 'SIBL',
    accountNumberLength: [11, 16],
    accountNumberFormat: '11 or 16 digits',
    category: 'private'
  },
  {
    id: 'city',
    name: 'City Union Bank',
    shortName: 'CUB',
    ifscPrefix: 'CIUB',
    accountNumberLength: [15],
    accountNumberFormat: '15 digits',
    category: 'private'
  },
  {
    id: 'dcb',
    name: 'DCB Bank',
    shortName: 'DCB',
    ifscPrefix: 'DCBL',
    accountNumberLength: [14],
    accountNumberFormat: '14 digits',
    category: 'private'
  },
  {
    id: 'bandhan',
    name: 'Bandhan Bank',
    shortName: 'Bandhan',
    ifscPrefix: 'BDBL',
    accountNumberLength: [14, 15],
    accountNumberFormat: '14-15 digits',
    category: 'private'
  },

  // Foreign Banks
  {
    id: 'hsbc',
    name: 'HSBC Bank',
    shortName: 'HSBC',
    ifscPrefix: 'HSBC',
    accountNumberLength: [12],
    accountNumberFormat: '12 digits',
    category: 'foreign'
  },
  {
    id: 'citi',
    name: 'Citibank',
    shortName: 'Citi',
    ifscPrefix: 'CITI',
    accountNumberLength: [10],
    accountNumberFormat: '10 digits',
    category: 'foreign'
  },
  {
    id: 'sc',
    name: 'Standard Chartered Bank',
    shortName: 'Standard Chartered',
    ifscPrefix: 'SCBL',
    accountNumberLength: [11, 14],
    accountNumberFormat: '11 or 14 digits',
    category: 'foreign'
  },
  {
    id: 'dbs',
    name: 'DBS Bank',
    shortName: 'DBS',
    ifscPrefix: 'DBSS',
    accountNumberLength: [12],
    accountNumberFormat: '12 digits',
    category: 'foreign'
  },

  // Regional Rural Banks (Sample)
  {
    id: 'andhra_pragathi',
    name: 'Andhra Pragathi Grameena Bank',
    shortName: 'APGB',
    ifscPrefix: 'APGB',
    accountNumberLength: [11, 14],
    accountNumberFormat: '11-14 digits',
    category: 'regional'
  },
  {
    id: 'kerala_gramin',
    name: 'Kerala Gramin Bank',
    shortName: 'KGB',
    ifscPrefix: 'KLGB',
    accountNumberLength: [14],
    accountNumberFormat: '14 digits',
    category: 'regional'
  },

  // Cooperative Banks (Sample)
  {
    id: 'saraswat',
    name: 'Saraswat Cooperative Bank',
    shortName: 'Saraswat',
    ifscPrefix: 'SRCB',
    accountNumberLength: [10, 11],
    accountNumberFormat: '10-11 digits',
    category: 'cooperative'
  },
  {
    id: 'cosmos',
    name: 'Cosmos Cooperative Bank',
    shortName: 'Cosmos',
    ifscPrefix: 'COSB',
    accountNumberLength: [14],
    accountNumberFormat: '14 digits',
    category: 'cooperative'
  },
];

// Add "Others" option for custom banks
export const otherBankOption: IndianBank = {
  id: 'others',
  name: 'Others',
  shortName: 'Others',
  ifscPrefix: '',
  accountNumberLength: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  accountNumberFormat: '8-20 digits',
  category: 'other' as any
};

export const allBanksWithOthers = [...indianBanks, otherBankOption];

export const getBankByName = (name: string): IndianBank | undefined => {
  return indianBanks.find(bank => 
    bank.name.toLowerCase().includes(name.toLowerCase()) ||
    bank.shortName.toLowerCase().includes(name.toLowerCase())
  );
};

export const getBankByIFSC = (ifsc: string): IndianBank | undefined => {
  const prefix = ifsc.substring(0, 4);
  return indianBanks.find(bank => bank.ifscPrefix === prefix);
};

export const validateAccountNumber = (bankId: string, accountNumber: string): boolean => {
  const bank = indianBanks.find(b => b.id === bankId);
  if (!bank) return false;
  
  const cleanAccountNumber = accountNumber.replace(/\D/g, '');
  return bank.accountNumberLength.includes(cleanAccountNumber.length);
};

export const validateIFSC = (ifsc: string): boolean => {
  const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscPattern.test(ifsc);
};