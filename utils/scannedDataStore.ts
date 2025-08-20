// Temporary storage for scanned data between screens
let scannedDataStore: string | null = null;

export const setScannedData = (data: string) => {
  scannedDataStore = data;
};

export const getScannedData = () => {
  return scannedDataStore;
};

export const clearScannedData = () => {
  scannedDataStore = null;
};

