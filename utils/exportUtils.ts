import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform, Alert } from 'react-native';
import * as XLSX from 'xlsx';

export type ExportFormat = 'pdf' | 'csv' | 'excel' | 'json';

export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any, row: any) => string;
}

export interface ExportConfig {
  title: string;
  fileName: string;
  columns: ExportColumn[];
  data: any[];
  summaryRows?: { label: string; value: string }[];
}

function getCellValue(row: any, col: ExportColumn): string {
  const raw = row[col.key];
  if (col.format) return col.format(raw, row);
  if (raw === null || raw === undefined) return '';
  return String(raw);
}

function formatAmountPlain(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateCSV(config: ExportConfig): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerRow = config.columns.map(c => escape(c.header)).join(',');
  const dataRows = config.data.map(row =>
    config.columns.map(col => escape(getCellValue(row, col))).join(',')
  );

  const lines = [headerRow, ...dataRows];

  if (config.summaryRows?.length) {
    lines.push('');
    config.summaryRows.forEach(sr => {
      lines.push(`${escape(sr.label)},${escape(sr.value)}`);
    });
  }

  return lines.join('\n');
}

function generateHTMLTable(config: ExportConfig): string {
  const now = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const headerCells = config.columns.map(c =>
    `<th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#374151;background:#F3F4F6;border-bottom:2px solid #D1D5DB;white-space:nowrap;">${c.header}</th>`
  ).join('');

  const dataRowsHTML = config.data.map((row, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
    const cells = config.columns.map(col =>
      `<td style="padding:7px 12px;font-size:11px;color:#1F2937;border-bottom:1px solid #E5E7EB;">${getCellValue(row, col)}</td>`
    ).join('');
    return `<tr style="background:${bg};">${cells}</tr>`;
  }).join('');

  let summaryHTML = '';
  if (config.summaryRows?.length) {
    const summaryRows = config.summaryRows.map(sr =>
      `<tr><td style="padding:6px 12px;font-weight:600;font-size:12px;color:#1F2937;">${sr.label}</td><td colspan="${config.columns.length - 1}" style="padding:6px 12px;font-weight:700;font-size:12px;color:#3f66ac;text-align:right;">${sr.value}</td></tr>`
    ).join('');
    summaryHTML = `<table style="width:100%;margin-top:16px;border-collapse:collapse;"><tbody>${summaryRows}</tbody></table>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; color: #1F2937; }
    @page { size: A4 landscape; margin: 12mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div style="margin-bottom:20px;">
    <h1 style="font-size:20px;font-weight:700;color:#1F2937;margin:0 0 4px 0;">${config.title}</h1>
    <p style="font-size:12px;color:#6B7280;margin:0;">Generated on ${now} &bull; ${config.data.length} records</p>
  </div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;">
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${dataRowsHTML}</tbody>
  </table>
  ${summaryHTML}
</body>
</html>`;
}

async function shareFile(fileUri: string, fileName: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert('Sharing Unavailable', 'Sharing is not available on this device');
    return;
  }

  try {
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: fileName,
    });
  } catch (error: any) {
    if (error?.message?.includes('cancelled') || error?.message?.includes('dismiss')) return;
    console.error('Share failed:', error);
  }
}

function triggerWebDownload(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerWebDownloadBinary(data: Uint8Array, fileName: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportData(config: ExportConfig, format: ExportFormat): Promise<void> {
  if (!config.data || config.data.length === 0) {
    Alert.alert('No Data', 'There is no data to export.');
    return;
  }

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const baseFileName = `${config.fileName}_${timestamp}`;

  try {
    switch (format) {
      case 'csv':
        await exportCSV(config, baseFileName);
        break;
      case 'json':
        await exportJSON(config, baseFileName);
        break;
      case 'excel':
        await exportExcel(config, baseFileName);
        break;
      case 'pdf':
        await exportPDF(config, baseFileName);
        break;
    }
  } catch (error: any) {
    console.error(`Export ${format} failed:`, error);
    Alert.alert('Export Failed', error.message || `Failed to export as ${format.toUpperCase()}`);
  }
}

async function exportCSV(config: ExportConfig, baseFileName: string): Promise<void> {
  const csv = generateCSV(config);
  const fileName = `${baseFileName}.csv`;

  if (Platform.OS === 'web') {
    triggerWebDownload(csv, fileName, 'text/csv');
    return;
  }

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(fileUri, fileName, 'text/csv');
}

async function exportJSON(config: ExportConfig, baseFileName: string): Promise<void> {
  const exportObj = {
    title: config.title,
    exportedAt: new Date().toISOString(),
    recordCount: config.data.length,
    data: config.data.map(row => {
      const obj: Record<string, any> = {};
      config.columns.forEach(col => {
        obj[col.header] = getCellValue(row, col);
      });
      return obj;
    }),
    ...(config.summaryRows?.length ? {
      summary: config.summaryRows.reduce((acc, sr) => {
        acc[sr.label] = sr.value;
        return acc;
      }, {} as Record<string, string>)
    } : {}),
  };

  const json = JSON.stringify(exportObj, null, 2);
  const fileName = `${baseFileName}.json`;

  if (Platform.OS === 'web') {
    triggerWebDownload(json, fileName, 'application/json');
    return;
  }

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(fileUri, fileName, 'application/json');
}

async function exportExcel(config: ExportConfig, baseFileName: string): Promise<void> {
  const wsData: any[][] = [];

  wsData.push(config.columns.map(c => c.header));

  config.data.forEach(row => {
    wsData.push(config.columns.map(col => getCellValue(row, col)));
  });

  if (config.summaryRows?.length) {
    wsData.push([]);
    config.summaryRows.forEach(sr => {
      wsData.push([sr.label, sr.value]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = config.columns.map((col, idx) => {
    let maxLen = col.header.length;
    config.data.forEach(row => {
      const val = getCellValue(row, col);
      if (val.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.title.slice(0, 31));

  const fileName = `${baseFileName}.xlsx`;

  if (Platform.OS === 'web') {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    triggerWebDownloadBinary(new Uint8Array(wbout), fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return;
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
  await shareFile(fileUri, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

async function exportPDF(config: ExportConfig, baseFileName: string): Promise<void> {
  const html = generateHTMLTable(config);
  const fileName = `${baseFileName}.pdf`;

  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const destUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: destUri });
  await shareFile(destUri, fileName, 'application/pdf');
}

export { formatAmountPlain };
