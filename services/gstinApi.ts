const API_BASE_URL = 'https://appyflow.in/api';
const API_KEY = 'hauCsh5y2jT087Fysjvo7J2IRtf2';

export interface GSTINVerificationResponse {
  error: boolean;
  message?: string;
  taxpayerInfo?: {
    ctj: string;
    pradr: {
      ntr: string;
      addr: {
        lg: string;
        bnm: string;
        stcd: string;
        flno: string;
        pncd: string;
        city: string;
        lt: string;
        dst: string;
        st: string;
        bno: string;
        loc: string;
      };
    };
    tradeNam: string;
    lgnm: string;
    cxdt: string;
    ctb: string;
    rgdt: string;
    adadr: any[];
    dty: string;
    lstupdt: string;
    nba: string[];
    stjCd: string;
    stj: string;
    gstin: string;
    ctjCd: string;
    sts: string;
  };
  filing: any[];
  compliance: {
    filingFrequency: any;
  };
}

export interface GSTINFilingResponse {
  error: boolean;
  message?: string;
  EFiledlist?: Array<{
    arn: string;
    dof: string;
    mof: string;
    ret_prd: string;
    rtntype: string;
    status: string;
    valid?: string;
  }>;
}

export interface GSTINFilingFrequencyResponse {
  error: boolean;
  message?: string;
  response?: Array<{
    preference: string;
    quarter: string;
  }>;
}

export const verifyGSTIN = async (gstNo: string): Promise<GSTINVerificationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/verifyGST`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key_secret: API_KEY,
        gstNo: gstNo,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GSTIN verification error:', error);
    return {
      error: true,
      message: 'Failed to verify GSTIN. Please check your internet connection and try again.',
      filing: [],
      compliance: {
        filingFrequency: null
      }
    };
  }
};

export const getGSTINFilingDetails = async (
  gstNo: string,
  year: string
): Promise<GSTINFilingResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/GST/filing-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key_secret: API_KEY,
        gstNo: gstNo,
        year: year,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GSTIN filing details error:', error);
    return {
      error: true,
      message: 'Failed to fetch filing details. Please try again.',
    };
  }
};

export const getGSTINFilingFrequency = async (
  gstNo: string,
  year: string
): Promise<GSTINFilingFrequencyResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/GST/filing-frequency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key_secret: API_KEY,
        gstNo: gstNo,
        year: year,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GSTIN filing frequency error:', error);
    return {
      error: true,
      message: 'Failed to fetch filing frequency. Please try again.',
    };
  }
};