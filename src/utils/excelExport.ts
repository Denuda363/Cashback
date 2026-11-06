import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { CashbackSettings, CustomerMaster, CustomerSummary, Invoice } from '../types/cashback';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu Klaim',
  ready: 'Siap Dicairkan',
  disbursed: 'Sudah Dicairkan',
};

const PAYOUT_LABELS: Record<string, string> = {
  transfer_bank: 'Transfer Bank',
  e_wallet: 'E-Wallet',
  potongan_belanja: 'Potongan Belanja',
  tunai: 'Tunai di Kasir',
};

// Common borders and fills
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  left: { style: 'thin', color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
  right: { style: 'thin', color: { argb: 'FF94A3B8' } },
};

const totalBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF475569' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'double', color: { argb: 'FF0F172A' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const headerFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE2E8F0' }, // Soft slate background
};

const receiptHeaderFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE9ECF0' }, // Exact subtle grey/blue tone from user's image
};

const totalFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' },
};

const headerFont: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FF0F172A' },
};

const dataFont: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  color: { argb: 'FF1E293B' },
};

const totalFont: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FF0F172A' },
};

const RUPIAH_NUM_FMT = '"Rp"#,##0';
const PERCENT_NUM_FMT = '0.0%';

/**
 * Creates the exact Excel sheet matching the user's uploaded image:
 * Headers:
 * Col A: No (Rata Tengah)
 * Col B: Nama Konsumen (Rata Kiri)
 * Col C: Total Pembelanjaan (Rata Kanan, Format Angka Rupiah)
 * Col D: Carshback (Rata Kanan, Format Angka Rupiah, Rumus: Total Belanja x Persentase Cashback)
 * Col E: Parcel (Rata Tengah, 'Ya' / 'Tidak')
 * Col F & G: Tanda tangan (Merged F1:G1, Rata Tengah, angka berselang-seling)
 */
export function populateTandaTerimaSheet(
  ws: ExcelJS.Worksheet,
  customerSummaries: CustomerSummary[],
  settings: CashbackSettings
): void {
  const minSpendParcel = settings.minSpendForParcel || 5000000;

  // Set grid lines visible
  ws.views = [{ showGridLines: true }];

  // Column definitions & widths
  ws.columns = [
    { width: 8 },  // A: No
    { width: 26 }, // B: Nama Konsumen
    { width: 22 }, // C: Total Pembelanjaan
    { width: 20 }, // D: Carshback
    { width: 12 }, // E: Parcel
    { width: 15 }, // F: Tanda tangan (Ganjil)
    { width: 15 }, // G: Tanda tangan (Genap)
  ];

  // 1. Header row matching exact image format
  const headerRow = ws.addRow([
    'No',
    'Nama Konsumen',
    'Total Pembelanjaan',
    'Carshback',
    'Parcel',
    'Tanda tangan',
    '',
  ]);
  headerRow.height = 26;

  // Apply styling to header cells
  for (let c = 1; c <= 7; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = receiptHeaderFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  }

  // Merge F1:G1 for "Tanda tangan"
  ws.mergeCells('F1:G1');

  // 2. Data rows
  customerSummaries.forEach((cust, idx) => {
    const rowNum = idx + 2; // Row in sheet (1-based, row 1 is header)
    const seqNo = idx + 1;

    // Staggered signature columns F and G
    const sigF = idx % 2 === 0 ? seqNo : '';
    const sigG = idx % 2 !== 0 ? seqNo : '';

    // Parcel determination: 'Ya' or 'Tidak'
    const isParcel = cust.getParcel !== undefined
      ? cust.getParcel
      : (cust.totalPurchase >= minSpendParcel);
    const parcelText = isParcel ? 'Ya' : 'Tidak';

    // Percentage calculation for the formula (in flat mode, strictly use settings.flatPercentage)
    const pct = settings.mode === 'flat'
      ? settings.flatPercentage
      : (cust.totalPurchase > 0
          ? Number(((cust.totalCashback / cust.totalPurchase) * 100).toFixed(2))
          : (settings.flatPercentage || 2));

    // Formula: Total Belanja (Col C) * Persentase Cashback (e.g. C2*2% or C2*3%)
    const formulaString = `ROUND(C${rowNum}*${pct}%, 0)`;
    const expectedCashback = settings.mode === 'flat'
      ? Math.round((cust.totalPurchase || 0) * (pct / 100))
      : (cust.totalCashback || 0);

    const row = ws.addRow([
      seqNo,
      cust.customerName,
      cust.totalPurchase || 0,
      { formula: formulaString, result: expectedCashback },
      parcelText,
      sigF,
      sigG,
    ]);
    row.height = 30; // Generous height for physical signatures

    // Alignments & Number formats
    // Col A: No -> Rata Tengah
    const cellA = row.getCell(1);
    cellA.alignment = { horizontal: 'center', vertical: 'middle' };
    cellA.font = dataFont;
    cellA.border = thinBorder;

    // Col B: Nama Konsumen -> Rata Kiri
    const cellB = row.getCell(2);
    cellB.alignment = { horizontal: 'left', vertical: 'middle' };
    cellB.font = dataFont;
    cellB.border = thinBorder;

    // Col C: Total Pembelanjaan -> Rata Kanan, Format Rupiah
    const cellC = row.getCell(3);
    cellC.alignment = { horizontal: 'right', vertical: 'middle' };
    cellC.numFmt = RUPIAH_NUM_FMT;
    cellC.font = dataFont;
    cellC.border = thinBorder;

    // Col D: Carshback (Rumus) -> Rata Kanan, Format Rupiah
    const cellD = row.getCell(4);
    cellD.alignment = { horizontal: 'right', vertical: 'middle' };
    cellD.numFmt = RUPIAH_NUM_FMT;
    cellD.font = dataFont;
    cellD.border = thinBorder;

    // Col E: Parcel -> Rata Tengah
    const cellE = row.getCell(5);
    cellE.alignment = { horizontal: 'center', vertical: 'middle' };
    cellE.font = dataFont;
    cellE.border = thinBorder;

    // Col F: Tanda tangan ganjil -> Rata Kiri
    const cellF = row.getCell(6);
    cellF.alignment = { horizontal: 'left', vertical: 'middle' };
    cellF.font = dataFont;
    cellF.border = thinBorder;

    // Col G: Tanda tangan genap -> Rata Kiri
    const cellG = row.getCell(7);
    cellG.alignment = { horizontal: 'left', vertical: 'middle' };
    cellG.font = dataFont;
    cellG.border = thinBorder;
  });

  // 3. Summary / Total Row at the bottom
  const lastDataRow = customerSummaries.length + 1;
  const totalRowNum = lastDataRow + 1;

  if (customerSummaries.length > 0) {
    const totalRow = ws.addRow([
      'TOTAL KESELURUHAN',
      '',
      { formula: `SUM(C2:C${lastDataRow})`, result: customerSummaries.reduce((s, c) => s + c.totalPurchase, 0) },
      { formula: `SUM(D2:D${lastDataRow})`, result: customerSummaries.reduce((s, c) => s + c.totalCashback, 0) },
      { formula: `COUNTIF(E2:E${lastDataRow},"Ya")&" Penerima"`, result: `${customerSummaries.filter(c => c.getParcel).length} Penerima` },
      '',
      '',
    ]);
    totalRow.height = 26;

    // Merge A and B for TOTAL label
    ws.mergeCells(`A${totalRowNum}:B${totalRowNum}`);

    for (let c = 1; c <= 7; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = totalFill;
      cell.font = totalFont;
      cell.border = totalBorder;
      if (c === 1 || c === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 3 || c === 4) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = RUPIAH_NUM_FMT;
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  }
}

/**
 * Exports single-sheet dedicated Excel file formatted exactly like the user's image.
 */
export async function exportTandaTerimaFormat(
  customerSummaries: CustomerSummary[],
  settings: CashbackSettings,
  filenamePrefix = 'Rekap_Tanda_Terima_Cashback'
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = settings.storeName || 'CashbackPro';
  wb.created = new Date();

  const ws = wb.addWorksheet('Rekap Tanda Tangan');
  populateTandaTerimaSheet(ws, customerSummaries, settings);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${dateStr}.xlsx`;

  saveAs(blob, filename);
}

/**
 * Exports comprehensive multi-sheet workbook with structured tables,
 * aligned data columns, Rupiah currency formatting, and live calculation formulas.
 */
export async function exportCashbackToExcel(
  invoices: Invoice[],
  customerSummaries: CustomerSummary[],
  settings: CashbackSettings,
  filenamePrefix = 'Rekap_Cashback_Konsumen',
  masterCustomers?: CustomerMaster[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = settings.storeName || 'CashbackPro';
  wb.created = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Format Tanda Terima & Parcel (Exact format from user's image)
  // -------------------------------------------------------------
  const wsTandaTerima = wb.addWorksheet('Format Tanda Terima');
  populateTandaTerimaSheet(wsTandaTerima, customerSummaries, settings);

  // -------------------------------------------------------------
  // Sheet 2: Rekap Rincian Faktur
  // -------------------------------------------------------------
  const wsInvoices = wb.addWorksheet('Rekap Faktur', {
    views: [{ showGridLines: true }],
  });

  wsInvoices.columns = [
    { width: 6 },  // A: No
    { width: 18 }, // B: No. Faktur
    { width: 14 }, // C: Tanggal
    { width: 24 }, // D: Nama Konsumen
    { width: 18 }, // E: No. Telepon / WA
    { width: 18 }, // F: Kategori
    { width: 28 }, // G: Deskripsi Barang
    { width: 20 }, // H: Nilai Belanja (Rp)
    { width: 14 }, // I: % Cashback
    { width: 20 }, // J: Nilai Cashback (Rp) - RUMUS
    { width: 12 }, // K: Parcel
    { width: 18 }, // L: Status Klaim
    { width: 20 }, // M: Metode Pencairan
    { width: 14 }, // N: Tgl Pencairan
    { width: 28 }, // O: Catatan
  ];

  const invHeader = wsInvoices.addRow([
    'No',
    'No. Faktur',
    'Tanggal',
    'Nama Konsumen',
    'No. Telepon / WA',
    'Kategori',
    'Deskripsi Barang',
    'Nilai Belanja (Rp)',
    '% Cashback',
    'Nilai Cashback (Rp)',
    'Parcel',
    'Status Klaim',
    'Metode Pencairan',
    'Tgl Pencairan',
    'Catatan',
  ]);
  invHeader.height = 26;

  for (let c = 1; c <= 15; c++) {
    const cell = invHeader.getCell(c);
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  }

  // Populate Invoices Data
  invoices.forEach((inv, idx) => {
    const r = idx + 2;
    const isParcel = inv.getParcel !== undefined
      ? inv.getParcel
      : inv.purchaseAmount >= (settings.minSpendForParcel || 5000000);

    // Formula: Total Belanja (Col H) * Persentase Cashback (Col I)
    const formulaString = `ROUND(H${r}*I${r}, 0)`;

    const row = wsInvoices.addRow([
      idx + 1,
      inv.invoiceNumber,
      inv.date,
      inv.customerName,
      inv.customerPhone,
      inv.category,
      inv.itemsDescription || '-',
      inv.purchaseAmount,
      inv.cashbackPercentage / 100, // Stored as decimal (e.g. 0.02)
      { formula: formulaString, result: inv.cashbackAmount },
      isParcel ? 'Ya' : 'Tidak',
      STATUS_LABELS[inv.claimStatus] || inv.claimStatus,
      PAYOUT_LABELS[inv.payoutMethod] || inv.payoutMethod,
      inv.disbursedDate || '-',
      inv.notes || '-',
    ]);
    row.height = 22;

    // Apply alignments & formats
    // Rata Tengah: No (1), No Faktur (2), Tanggal (3), Telepon (5), % Cashback (9), Parcel (11), Status (12), Metode (13), Tgl Cair (14)
    // Rata Kiri: Nama (4), Kategori (6), Deskripsi (7), Catatan (15)
    // Rata Kanan: Nilai Belanja (8), Nilai Cashback (10)
    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      cell.font = dataFont;
      cell.border = thinBorder;

      if ([1, 2, 3, 5, 11, 12, 13, 14].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if ([4, 6, 7, 15].includes(c)) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (c === 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = RUPIAH_NUM_FMT;
      } else if (c === 9) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = PERCENT_NUM_FMT;
      } else if (c === 10) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = RUPIAH_NUM_FMT;
      }
    }
  });

  // Total Row for Invoices
  if (invoices.length > 0) {
    const lastInvRow = invoices.length + 1;
    const invTotalRowNum = lastInvRow + 1;
    const totalRow = wsInvoices.addRow([
      'TOTAL KESELURUHAN',
      '',
      '',
      '',
      '',
      '',
      '',
      { formula: `SUM(H2:H${lastInvRow})`, result: invoices.reduce((s, i) => s + i.purchaseAmount, 0) },
      { formula: `AVERAGE(I2:I${lastInvRow})`, result: invoices.length > 0 ? (invoices.reduce((s, i) => s + i.cashbackPercentage, 0) / invoices.length) / 100 : 0 },
      { formula: `SUM(J2:J${lastInvRow})`, result: invoices.reduce((s, i) => s + i.cashbackAmount, 0) },
      { formula: `COUNTIF(K2:K${lastInvRow},"Ya")&" Penerima"`, result: `${invoices.filter(i => i.getParcel).length} Penerima` },
      '',
      '',
      '',
      '',
    ]);
    totalRow.height = 26;

    wsInvoices.mergeCells(`A${invTotalRowNum}:G${invTotalRowNum}`);

    for (let c = 1; c <= 15; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = totalFill;
      cell.font = totalFont;
      cell.border = totalBorder;

      if (c <= 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 8 || c === 10) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = RUPIAH_NUM_FMT;
      } else if (c === 9) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = PERCENT_NUM_FMT;
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // AutoFilter for structured table look
    wsInvoices.autoFilter = `A1:O${lastInvRow}`;
  }

  // -------------------------------------------------------------
  // Sheet 3: Rekap Per Konsumen
  // -------------------------------------------------------------
  const wsCustomers = wb.addWorksheet('Rekap Per Konsumen', {
    views: [{ showGridLines: true }],
  });

  wsCustomers.columns = [
    { width: 10 }, // A: Peringkat
    { width: 24 }, // B: Nama Konsumen
    { width: 18 }, // C: No. Telepon / WA
    { width: 14 }, // D: Tier Loyalitas
    { width: 14 }, // E: Jumlah Faktur
    { width: 22 }, // F: Total Belanja (Rp)
    { width: 16 }, // G: % Cashback
    { width: 22 }, // H: Total Cashback (Rp) - RUMUS
    { width: 12 }, // I: Parcel
    { width: 22 }, // J: Sudah Dicairkan (Rp)
    { width: 22 }, // K: Sisa Belum Cair (Rp) - RUMUS
    { width: 16 }, // L: Belanja Terakhir
  ];

  const custHeader = wsCustomers.addRow([
    'Peringkat',
    'Nama Konsumen',
    'No. Telepon / WA',
    'Tier Loyalitas',
    'Jumlah Faktur',
    'Total Belanja (Rp)',
    '% Cashback Rata-rata',
    'Total Cashback (Rp)',
    'Parcel',
    'Sudah Dicairkan (Rp)',
    'Sisa Belum Cair (Rp)',
    'Belanja Terakhir',
  ]);
  custHeader.height = 26;

  for (let c = 1; c <= 12; c++) {
    const cell = custHeader.getCell(c);
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  }

  customerSummaries.forEach((cust, idx) => {
    const r = idx + 2;
    const isParcel = cust.getParcel !== undefined
      ? cust.getParcel
      : cust.totalPurchase >= (settings.minSpendForParcel || 5000000);

    const effectiveRate = cust.totalPurchase > 0
      ? (cust.totalCashback / cust.totalPurchase)
      : (settings.flatPercentage / 100);

    // Formula for Total Cashback: Total Belanja (Col F) * % Cashback (Col G)
    const formulaCashback = `ROUND(F${r}*G${r}, 0)`;
    // Formula for Sisa: Total Cashback (Col H) - Sudah Dicairkan (Col J)
    const formulaSisa = `H${r}-J${r}`;

    const row = wsCustomers.addRow([
      idx + 1,
      cust.customerName,
      cust.customerPhone,
      cust.tier,
      cust.invoiceCount,
      cust.totalPurchase,
      effectiveRate,
      { formula: formulaCashback, result: cust.totalCashback },
      isParcel ? 'Ya' : 'Tidak',
      cust.disbursedCashback,
      { formula: formulaSisa, result: cust.totalCashback - cust.disbursedCashback },
      cust.lastPurchaseDate,
    ]);
    row.height = 22;

    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.font = dataFont;
      cell.border = thinBorder;

      if ([1, 3, 4, 5, 9, 12].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 2) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (c === 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = PERCENT_NUM_FMT;
      } else if ([6, 8, 10, 11].includes(c)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = RUPIAH_NUM_FMT;
      }
    }
  });

  if (customerSummaries.length > 0) {
    const lastCustRow = customerSummaries.length + 1;
    const custTotalRowNum = lastCustRow + 1;
    const totalRow = wsCustomers.addRow([
      'TOTAL KESELURUHAN',
      '',
      '',
      '',
      { formula: `SUM(E2:E${lastCustRow})`, result: customerSummaries.reduce((s, c) => s + c.invoiceCount, 0) },
      { formula: `SUM(F2:F${lastCustRow})`, result: customerSummaries.reduce((s, c) => s + c.totalPurchase, 0) },
      { formula: `AVERAGE(G2:G${lastCustRow})`, result: 0.02 },
      { formula: `SUM(H2:H${lastCustRow})`, result: customerSummaries.reduce((s, c) => s + c.totalCashback, 0) },
      { formula: `COUNTIF(I2:I${lastCustRow},"Ya")&" Penerima"`, result: `${customerSummaries.filter(c => c.getParcel).length} Penerima` },
      { formula: `SUM(J2:J${lastCustRow})`, result: customerSummaries.reduce((s, c) => s + c.disbursedCashback, 0) },
      { formula: `SUM(K2:K${lastCustRow})`, result: customerSummaries.reduce((s, c) => s + (c.totalCashback - c.disbursedCashback), 0) },
      '',
    ]);
    totalRow.height = 26;

    wsCustomers.mergeCells(`A${custTotalRowNum}:D${custTotalRowNum}`);

    for (let c = 1; c <= 12; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = totalFill;
      cell.font = totalFont;
      cell.border = totalBorder;

      if (c <= 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 5 || c === 9 || c === 12) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = PERCENT_NUM_FMT;
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = RUPIAH_NUM_FMT;
      }
    }

    wsCustomers.autoFilter = `A1:L${lastCustRow}`;
  }

  // -------------------------------------------------------------
  // Sheet 4: Top 10 Konsumen Tertinggi
  // -------------------------------------------------------------
  const wsTop10 = wb.addWorksheet('Top 10 Tertinggi', {
    views: [{ showGridLines: true }],
  });

  wsTop10.columns = [
    { width: 10 }, // A: Peringkat
    { width: 24 }, // B: Nama Konsumen
    { width: 18 }, // C: No. Kontak / WA
    { width: 14 }, // D: Tier Member
    { width: 14 }, // E: Jumlah Faktur
    { width: 22 }, // F: Total Belanja (Rp)
    { width: 16 }, // G: % Cashback
    { width: 22 }, // H: Total Cashback (Rp) - RUMUS
    { width: 12 }, // I: Parcel
    { width: 18 }, // J: % Kontribusi
  ];

  const top10Header = wsTop10.addRow([
    'Peringkat',
    'Nama Konsumen',
    'No. Kontak / WA',
    'Tier Member',
    'Jumlah Faktur',
    'Total Belanja (Rp)',
    '% Cashback',
    'Total Cashback (Rp)',
    'Parcel',
    '% Kontribusi Total',
  ]);
  top10Header.height = 26;

  for (let c = 1; c <= 10; c++) {
    const cell = top10Header.getCell(c);
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  }

  const totalAllCashback = customerSummaries.reduce((sum, c) => sum + c.totalCashback, 0);
  const top10List = customerSummaries.slice(0, 10);

  top10List.forEach((c, idx) => {
    const r = idx + 2;
    const isParcel = c.getParcel !== undefined
      ? c.getParcel
      : c.totalPurchase >= (settings.minSpendForParcel || 5000000);

    const rate = c.totalPurchase > 0 ? (c.totalCashback / c.totalPurchase) : (settings.flatPercentage / 100);
    const kontribusi = totalAllCashback > 0 ? (c.totalCashback / totalAllCashback) : 0;

    const row = wsTop10.addRow([
      idx + 1,
      c.customerName,
      c.customerPhone,
      c.tier,
      c.invoiceCount,
      c.totalPurchase,
      rate,
      { formula: `ROUND(F${r}*G${r}, 0)`, result: c.totalCashback },
      isParcel ? 'Ya' : 'Tidak',
      kontribusi,
    ]);
    row.height = 22;

    for (let col = 1; col <= 10; col++) {
      const cell = row.getCell(col);
      cell.font = dataFont;
      cell.border = thinBorder;

      if ([1, 3, 4, 5, 9].includes(col)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (col === 2) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (col === 7 || col === 10) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = PERCENT_NUM_FMT;
      } else if (col === 6 || col === 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = RUPIAH_NUM_FMT;
      }
    }
  });

  if (top10List.length > 0) {
    wsTop10.autoFilter = `A1:J${top10List.length + 1}`;
  }

  // -------------------------------------------------------------
  // Sheet 5: Master Konsumen (Optional)
  // -------------------------------------------------------------
  if (masterCustomers && masterCustomers.length > 0) {
    const wsMaster = wb.addWorksheet('Master Konsumen', {
      views: [{ showGridLines: true }],
    });

    wsMaster.columns = [
      { width: 6 },  // A: No
      { width: 16 }, // B: Kode Konsumen
      { width: 24 }, // C: Nama Konsumen
      { width: 18 }, // D: No. Telepon / WA
      { width: 24 }, // E: Email
      { width: 16 }, // F: Kota
      { width: 28 }, // G: Alamat
      { width: 16 }, // H: Nama Bank
      { width: 20 }, // I: No. Rekening
      { width: 22 }, // J: Atas Nama Rekening
      { width: 16 }, // K: E-Wallet
      { width: 18 }, // L: No. E-Wallet
      { width: 20 }, // M: Payout Default
      { width: 14 }, // N: Tgl Terdaftar
      { width: 12 }, // O: Status
      { width: 28 }, // P: Catatan
    ];

    const masterHeader = wsMaster.addRow([
      'No',
      'Kode Konsumen',
      'Nama Konsumen',
      'No. Telepon / WA',
      'Email',
      'Kota',
      'Alamat',
      'Nama Bank',
      'No. Rekening',
      'Atas Nama Rekening',
      'E-Wallet',
      'No. E-Wallet',
      'Payout Default',
      'Tgl Terdaftar',
      'Status',
      'Catatan',
    ]);
    masterHeader.height = 26;

    for (let c = 1; c <= 16; c++) {
      const cell = masterHeader.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    }

    masterCustomers.forEach((mc, idx) => {
      const row = wsMaster.addRow([
        idx + 1,
        mc.customerCode,
        mc.name,
        mc.phone,
        mc.email || '-',
        mc.city || '-',
        mc.address || '-',
        mc.bankName || '-',
        mc.bankAccountNumber || '-',
        mc.bankAccountHolder || '-',
        mc.eWalletType || '-',
        mc.eWalletNumber || '-',
        mc.preferredPayoutMethod ? PAYOUT_LABELS[mc.preferredPayoutMethod] : '-',
        mc.joinedDate,
        mc.isActive ? 'Aktif' : 'Non-Aktif',
        mc.notes || '-',
      ]);
      row.height = 22;

      for (let c = 1; c <= 16; c++) {
        const cell = row.getCell(c);
        cell.font = dataFont;
        cell.border = thinBorder;

        if ([1, 2, 4, 14, 15].includes(c)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });

    wsMaster.autoFilter = `A1:P${masterCustomers.length + 1}`;
  }

  // -------------------------------------------------------------
  // Sheet 6: Parameter & Kebijakan Toko
  // -------------------------------------------------------------
  const wsParams = wb.addWorksheet('Parameter & Kebijakan', {
    views: [{ showGridLines: true }],
  });

  wsParams.columns = [{ width: 38 }, { width: 50 }];

  const paramHeader = wsParams.addRow(['Parameter Sistem', 'Nilai / Konfigurasi']);
  paramHeader.height = 26;
  paramHeader.getCell(1).fill = headerFill;
  paramHeader.getCell(1).font = headerFont;
  paramHeader.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  paramHeader.getCell(1).border = thinBorder;

  paramHeader.getCell(2).fill = headerFill;
  paramHeader.getCell(2).font = headerFont;
  paramHeader.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
  paramHeader.getCell(2).border = thinBorder;

  const totalOmset = invoices.reduce((sum, inv) => sum + inv.purchaseAmount, 0);

  const paramData: [string, string | number, boolean][] = [
    ['Nama Usaha / Toko', settings.storeName, false],
    ['Tanggal Export Data', new Date().toLocaleString('id-ID'), false],
    ['Total Faktur Tercatat', invoices.length, false],
    ['Total Konsumen Terdaftar', customerSummaries.length, false],
    ['Total Omset Penjualan', totalOmset, true],
    ['Total Cashback Diberikan', totalAllCashback, true],
    ['Mode Pengaturan Cashback', settings.mode === 'flat' ? 'Persentase Flat' : 'Bertingkat (Tiered)', false],
    [
      'Aturan Persentase Aktif',
      settings.mode === 'flat'
        ? `${settings.flatPercentage}% untuk semua transaksi`
        : settings.tiers.map((t) => `${t.label}: ${t.percentage}%`).join(' | '),
      false,
    ],
    ['Batas Minimum Pembelian', settings.minPurchaseAmount, true],
    ['Batas Minimal Belanja Dapat Parcel', settings.minSpendForParcel || 5000000, true],
    [
      'Maksimum Cashback / Transaksi',
      settings.maxCashbackPerTransaction ? settings.maxCashbackPerTransaction : 'Tanpa Batas',
      typeof settings.maxCashbackPerTransaction === 'number',
    ],
    ['Masa Berlaku Klaim', `${settings.claimValidityDays} Hari`, false],
  ];

  paramData.forEach(([param, val, isMoney]) => {
    const row = wsParams.addRow([param, val]);
    row.height = 22;

    const cell1 = row.getCell(1);
    cell1.font = dataFont;
    cell1.border = thinBorder;
    cell1.alignment = { horizontal: 'left', vertical: 'middle' };

    const cell2 = row.getCell(2);
    cell2.font = dataFont;
    cell2.border = thinBorder;

    if (isMoney && typeof val === 'number') {
      cell2.numFmt = RUPIAH_NUM_FMT;
      cell2.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell2.alignment = { horizontal: 'left', vertical: 'middle' };
    }
  });

  // Write workbook to file
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${dateStr}.xlsx`;

  saveAs(blob, filename);
}
