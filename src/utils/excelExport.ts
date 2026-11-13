import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { CashbackSettings, CustomerMaster, CustomerSummary, Invoice, ClaimStatus, PayoutMethod } from '../types/cashback';
import { getBenefitLabel } from './cashbackCalculator';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu Klaim',
  ready: 'Siap Dicairkan',
  disbursed: 'Sudah Dicairkan',
};

const PAYOUT_LABELS: Record<string, string> = {
  transfer_bank: 'Tunai (Cash)',
  e_wallet: 'Tunai (Cash)',
  potongan_belanja: 'Tunai (Cash)',
  tunai: 'Tunai (Cash)',
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
 * Extracts pure base64 data and image extension from a data URL or raw base64 string
 */
export function extractBase64Image(dataUrl?: string): { base64: string; extension: 'png' | 'jpeg' } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const trimmed = dataUrl.trim();
  const match = trimmed.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (match) {
    const ext = match[1].toLowerCase() === 'jpg' ? 'jpeg' : (match[1].toLowerCase() as 'png' | 'jpeg');
    return { base64: match[2], extension: ext };
  }
  // If it's already raw base64 string without data:image prefix
  if (trimmed.length > 50 && !trimmed.startsWith('http') && !trimmed.startsWith('data:')) {
    return { base64: trimmed, extension: 'png' };
  }
  return null;
}

/**
 * Creates the exact Excel sheet matching the user's uploaded image:
 * Headers:
 * Col A: No (Rata Tengah)
 * Col B: Nama Konsumen (Rata Kiri)
 * Col C: Total Pembelanjaan (Rata Kanan, Format Angka Rupiah)
 * Col D: Carshback (Rata Kanan, Format Angka Rupiah, Rumus: Total Belanja x Persentase Cashback)
 * Col E: Parcel (Rata Tengah, 'Ya' / 'Tidak')
 * Col F & G: Tanda tangan (Merged F1:G1, Rata Tengah, angka berselang-seling atau gambar tanda tangan penerima)
 */
export function populateTandaTerimaSheet(
  ws: ExcelJS.Worksheet,
  customerSummaries: CustomerSummary[],
  settings: CashbackSettings,
  wb?: ExcelJS.Workbook
): void {
  const minSpendParcel = settings.minSpendForParcel || 5000000;
  const targetWorkbook = wb || ws.workbook;

  // Set grid lines visible
  ws.views = [{ showGridLines: true }];

  // Column definitions & widths (increased to 18 for F & G to give ample room for digital signatures)
  ws.columns = [
    { width: 8 },  // A: No
    { width: 26 }, // B: Nama Konsumen
    { width: 22 }, // C: Total Pembelanjaan
    { width: 20 }, // D: Carshback
    { width: 20 }, // E: Paket Diterima
    { width: 18 }, // F: Tanda tangan (Ganjil)
    { width: 18 }, // G: Tanda tangan (Genap)
  ];

  // 1. Header row matching exact image format
  const headerRow = ws.addRow([
    'No',
    'Nama Konsumen',
    'Total Pembelanjaan',
    'Carshback',
    'Paket Diterima',
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
    const isOdd = idx % 2 === 0;

    // Check disbursement status
    const isDisbursed =
      (cust.disbursedCashback || 0) > 0 ||
      Boolean(cust.lastDisbursedDate) ||
      Boolean(cust.invoices && cust.invoices.some((i) => i.claimStatus === 'disbursed'));

    // Look for recipient digital signature in summary or related invoices
    const rawSignature =
      cust.disbursementSignature ||
      cust.invoices?.find((i) => Boolean(i.disbursementSignature))?.disbursementSignature;
    const signatureImage = extractBase64Image(rawSignature);

    // Signature column text:
    // - If disbursed and has signature image: cell text is empty (image will be placed on top)
    // - If disbursed but no signature image: show sequence number with [✓ Cair]
    // - If undisbursed: show sequence number staggered in F or G for physical signature
    let sigF: string | number = '';
    let sigG: string | number = '';

    if (!isDisbursed) {
      if (isOdd) sigF = seqNo;
      else sigG = seqNo;
    } else {
      if (!signatureImage) {
        const textLabel = `${seqNo}. [✓ Cair]`;
        if (isOdd) sigF = textLabel;
        else sigG = textLabel;
      } else {
        sigF = '';
        sigG = '';
      }
    }

    // Package received determination (Cashback + Parsel, Cashback, Parcel)
    const isParcel = cust.getParcel !== undefined
      ? cust.getParcel
      : (cust.totalPurchase >= minSpendParcel);
    const parcelText = cust.benefitType ? getBenefitLabel(cust.benefitType) : (isParcel ? 'Cashback + Parsel' : 'Cashback');

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
    // Generous height (36) to give perfect proportions for embedded signature images and signatures
    row.height = 36;

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
    cellF.alignment = { horizontal: isDisbursed && signatureImage ? 'center' : 'left', vertical: 'middle' };
    cellF.font = dataFont;
    cellF.border = thinBorder;

    // Col G: Tanda tangan genap -> Rata Kiri
    const cellG = row.getCell(7);
    cellG.alignment = { horizontal: isDisbursed && signatureImage ? 'center' : 'left', vertical: 'middle' };
    cellG.font = dataFont;
    cellG.border = thinBorder;

    // If customer has disbursed and has electronic digital signature, embed the signature image into the cell!
    if (isDisbursed && signatureImage && targetWorkbook) {
      try {
        const imageId = targetWorkbook.addImage({
          base64: signatureImage.base64,
          extension: signatureImage.extension,
        });

        // 0-indexed column: Col F is 5, Col G is 6
        const col0 = isOdd ? 5 : 6;
        const row0 = rowNum - 1; // 0-indexed row

        ws.addImage(imageId, {
          tl: { col: col0 + 0.08, row: row0 + 0.08 } as any,
          br: { col: col0 + 0.92, row: row0 + 0.92 } as any,
          editAs: 'oneCell',
        });
      } catch (err) {
        console.error(`Failed to embed signature image for ${cust.customerName}:`, err);
      }
    }
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
      {
        formula: `(COUNTIF(E2:E${lastDataRow},"*Parsel*")+COUNTIF(E2:E${lastDataRow},"*Parcel*"))&" Penerima"`,
        result: `${customerSummaries.filter((c) => c.getParcel || c.benefitType === 'cashback_parcel' || c.benefitType === 'parcel_only').length} Penerima`,
      },
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
  populateTandaTerimaSheet(ws, customerSummaries, settings, wb);

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
  populateTandaTerimaSheet(wsTandaTerima, customerSummaries, settings, wb);

  // -------------------------------------------------------------
  // Sheet 2: Rekap Rincian Faktur
  // -------------------------------------------------------------
  const wsInvoices = wb.addWorksheet('Rekap Faktur', {
    views: [{ showGridLines: true }],
  });

  const benefitMap = new Map<string, string>();
  customerSummaries.forEach((cs) => {
    const label = cs.benefitType ? getBenefitLabel(cs.benefitType) : (cs.getParcel ? 'Cashback + Parsel' : 'Cashback');
    benefitMap.set((cs.customerName || '').trim().toLowerCase(), label);
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
    { width: 20 }, // K: Paket Diterima
    { width: 18 }, // L: Status Klaim
    { width: 20 }, // M: Metode Pencairan
    { width: 14 }, // N: Tgl Pencairan
    { width: 28 }, // O: Catatan
    { width: 22 }, // P: Tanda Tangan Penerima
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
    'Paket Diterima',
    'Status Klaim',
    'Metode Pencairan',
    'Tgl Pencairan',
    'Catatan',
    'Tanda Tangan Penerima',
  ]);
  invHeader.height = 26;

  for (let c = 1; c <= 16; c++) {
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
    const invBenefitLabel =
      benefitMap.get((inv.customerName || '').trim().toLowerCase()) ||
      (isParcel ? 'Cashback + Parsel' : 'Cashback');

    // Formula: Total Belanja (Col H) * Persentase Cashback (Col I)
    const formulaString = `ROUND(H${r}*I${r}, 0)`;

    const isInvDisbursed = inv.claimStatus === 'disbursed';
    const invSigImage = extractBase64Image(inv.disbursementSignature);

    let sigText = '-';
    if (isInvDisbursed) {
      sigText = invSigImage ? '' : (inv.recipientName ? `[✓ ${inv.recipientName}]` : '[✓ Dicairkan]');
    }

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
      invBenefitLabel,
      STATUS_LABELS[inv.claimStatus] || inv.claimStatus,
      PAYOUT_LABELS[inv.payoutMethod] || 'Tunai (Cash)',
      inv.disbursedDate || '-',
      inv.notes || '-',
      sigText,
    ]);
    row.height = isInvDisbursed && invSigImage ? 36 : 22;

    // Apply alignments & formats
    // Rata Tengah: No (1), No Faktur (2), Tanggal (3), Telepon (5), % Cashback (9), Parcel (11), Status (12), Metode (13), Tgl Cair (14), TTD (16)
    // Rata Kiri: Nama (4), Kategori (6), Deskripsi (7), Catatan (15)
    // Rata Kanan: Nilai Belanja (8), Nilai Cashback (10)
    for (let c = 1; c <= 16; c++) {
      const cell = row.getCell(c);
      cell.font = dataFont;
      cell.border = thinBorder;

      if ([1, 2, 3, 5, 11, 12, 13, 14, 16].includes(c)) {
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

    // Embed digital signature into Column P if disbursed with electronic signature
    if (isInvDisbursed && invSigImage) {
      try {
        const imageId = wb.addImage({
          base64: invSigImage.base64,
          extension: invSigImage.extension,
        });
        const row0 = r - 1; // 0-indexed row
        const col0 = 15; // 0-indexed column P is 15

        wsInvoices.addImage(imageId, {
          tl: { col: col0 + 0.08, row: row0 + 0.08 } as any,
          br: { col: col0 + 0.92, row: row0 + 0.92 } as any,
          editAs: 'oneCell',
        });
      } catch (err) {
        console.error(`Failed to embed signature for invoice ${inv.invoiceNumber}:`, err);
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
      { formula: `(COUNTIF(K2:K${lastInvRow},"*Parsel*")+COUNTIF(K2:K${lastInvRow},"*Parcel*"))&" Penerima"`, result: `${invoices.filter(i => i.getParcel).length} Penerima` },
      '',
      '',
      '',
      '',
      '',
    ]);
    totalRow.height = 26;

    wsInvoices.mergeCells(`A${invTotalRowNum}:G${invTotalRowNum}`);

    for (let c = 1; c <= 16; c++) {
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
    wsInvoices.autoFilter = `A1:P${lastInvRow}`;
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
    { width: 20 }, // I: Paket Diterima
    { width: 22 }, // J: Sudah Dicairkan (Rp)
    { width: 22 }, // K: Sisa Belum Cair (Rp) - RUMUS
    { width: 16 }, // L: Belanja Terakhir
    { width: 18 }, // M: Status Penerimaan
    { width: 22 }, // N: Tanda Tangan Penerima
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
    'Paket Diterima',
    'Sudah Dicairkan (Rp)',
    'Sisa Belum Cair (Rp)',
    'Belanja Terakhir',
    'Status Penerimaan',
    'Tanda Tangan Penerima',
  ]);
  custHeader.height = 26;

  for (let c = 1; c <= 14; c++) {
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

    const isCustDisbursed =
      (cust.disbursedCashback || 0) > 0 ||
      Boolean(cust.lastDisbursedDate) ||
      Boolean(cust.invoices && cust.invoices.some((i) => i.claimStatus === 'disbursed'));

    const rawCustSig =
      cust.disbursementSignature ||
      cust.invoices?.find((i) => Boolean(i.disbursementSignature))?.disbursementSignature;
    const custSigImage = extractBase64Image(rawCustSig);

    let statusPenerimaan = 'Belum Menerima';
    if (isCustDisbursed) {
      const sisa = (cust.totalCashback || 0) - (cust.disbursedCashback || 0);
      statusPenerimaan = sisa <= 0 && cust.totalCashback > 0 ? 'Sudah Menerima (Lunas)' : 'Sudah Menerima (Sebagian)';
    }

    let custSigText = '-';
    if (isCustDisbursed) {
      custSigText = custSigImage ? '' : (cust.recipientName ? `[✓ ${cust.recipientName}]` : '[✓ Sudah Terima]');
    }

    const row = wsCustomers.addRow([
      idx + 1,
      cust.customerName,
      cust.customerPhone,
      cust.tier,
      cust.invoiceCount,
      cust.totalPurchase,
      effectiveRate,
      { formula: formulaCashback, result: cust.totalCashback },
      cust.benefitType ? getBenefitLabel(cust.benefitType) : (isParcel ? 'Cashback + Parsel' : 'Cashback'),
      cust.disbursedCashback,
      { formula: formulaSisa, result: cust.totalCashback - cust.disbursedCashback },
      cust.lastPurchaseDate,
      statusPenerimaan,
      custSigText,
    ]);
    row.height = isCustDisbursed && custSigImage ? 36 : 22;

    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.font = dataFont;
      cell.border = thinBorder;

      if ([1, 3, 4, 5, 9, 12, 13, 14].includes(c)) {
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

    // Embed digital signature into Column N if disbursed with electronic signature
    if (isCustDisbursed && custSigImage) {
      try {
        const imageId = wb.addImage({
          base64: custSigImage.base64,
          extension: custSigImage.extension,
        });
        const row0 = r - 1; // 0-indexed row
        const col0 = 13; // 0-indexed column N is 13

        wsCustomers.addImage(imageId, {
          tl: { col: col0 + 0.08, row: row0 + 0.08 } as any,
          br: { col: col0 + 0.92, row: row0 + 0.92 } as any,
          editAs: 'oneCell',
        });
      } catch (err) {
        console.error(`Failed to embed customer signature for ${cust.customerName}:`, err);
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
      { formula: `(COUNTIF(I2:I${lastCustRow},"*Parsel*")+COUNTIF(I2:I${lastCustRow},"*Parcel*"))&" Penerima"`, result: `${customerSummaries.filter(c => c.getParcel || c.benefitType === 'cashback_parcel' || c.benefitType === 'parcel_only').length} Penerima` },
      { formula: `SUM(J2:J${lastCustRow})`, result: customerSummaries.reduce((s, c) => s + c.disbursedCashback, 0) },
      { formula: `SUM(K2:K${lastCustRow})`, result: customerSummaries.reduce((s, c) => s + (c.totalCashback - c.disbursedCashback), 0) },
      '',
      '',
      '',
    ]);
    totalRow.height = 26;

    wsCustomers.mergeCells(`A${custTotalRowNum}:D${custTotalRowNum}`);

    for (let c = 1; c <= 14; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = totalFill;
      cell.font = totalFont;
      cell.border = totalBorder;

      if (c <= 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 5 || c === 9 || c === 12 || c === 13 || c === 14) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = PERCENT_NUM_FMT;
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = RUPIAH_NUM_FMT;
      }
    }

    wsCustomers.autoFilter = `A1:N${lastCustRow}`;
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
    { width: 20 }, // I: Paket Diterima
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
    'Paket Diterima',
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
      c.benefitType ? getBenefitLabel(c.benefitType) : (isParcel ? 'Cashback + Parsel' : 'Cashback'),
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

/**
 * Export clean Excel Template for Importing Invoices
 */
export async function exportInvoiceImportTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CashbackPro';
  wb.lastModifiedBy = 'CashbackPro';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Template Faktur');

  ws.columns = [
    { header: 'No. Faktur (Wajib)', key: 'invoiceNumber', width: 22 },
    { header: 'Tanggal (YYYY-MM-DD)', key: 'date', width: 20 },
    { header: 'Nama Konsumen (Wajib)', key: 'customerName', width: 26 },
    { header: 'No. WhatsApp / HP (Wajib)', key: 'customerPhone', width: 24 },
    { header: 'Nilai Belanja (Angka Rp)', key: 'purchaseAmount', width: 22 },
    { header: 'Keterangan Barang (Opsional)', key: 'itemsDescription', width: 32 },
    { header: 'Status Klaim (pending/ready/disbursed)', key: 'claimStatus', width: 28 },
    { header: 'Metode Pencairan (tunai)', key: 'payoutMethod', width: 24 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  // Example sample rows
  const sampleRows = [
    ['INV-2026-001', '2026-01-15', 'Fatur', '081234567890', 5000000, 'Belanja Perlengkapan Rumah', 'ready', 'tunai'],
    ['INV-2026-002', '2026-01-18', 'fabio', '085712345678', 4000000, 'Elektronik & Aksesoris', 'disbursed', 'tunai'],
    ['INV-2026-003', '2026-02-05', 'Hendra Wijaya', '081398765432', 8500000, 'Grosir Sembako & Minyak', 'pending', 'tunai'],
    ['INV-2026-004', '2026-03-12', 'Siti Rahmawati', '082155667788', 3500000, 'Peralatan Masak', 'ready', 'tunai'],
  ];

  sampleRows.forEach((r) => {
    const row = ws.addRow(r);
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = dataFont;
      cell.border = thinBorder;
      if (colNumber === 5) {
        cell.numFmt = RUPIAH_NUM_FMT;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colNumber === 2 || colNumber === 7 || colNumber === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, 'Template_Import_Faktur_Cashback.xlsx');
}

export interface ParsedImportInvoice {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  purchaseAmount: number;
  itemsDescription?: string;
  claimStatus: ClaimStatus;
  payoutMethod: PayoutMethod;
  isValid: boolean;
  validationError?: string;
}

/**
 * Parses uploaded Excel file into invoice records
 */
export async function parseInvoicesFromExcel(file: File): Promise<ParsedImportInvoice[]> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');

  const results: ParsedImportInvoice[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const rawInvNum = row.getCell(1).text || String(row.getCell(1).value || '');
    const rawDate = row.getCell(2).text || String(row.getCell(2).value || '');
    const rawCustName = row.getCell(3).text || String(row.getCell(3).value || '');
    const rawPhone = row.getCell(4).text || String(row.getCell(4).value || '');
    const rawAmount = row.getCell(5).value;
    const rawDesc = row.getCell(6).text || String(row.getCell(6).value || '');
    const rawStatus = (row.getCell(7).text || String(row.getCell(7).value || '')).toLowerCase().trim();
    const rawPayout = (row.getCell(8).text || String(row.getCell(8).value || '')).toLowerCase().trim();

    if (!rawInvNum && !rawCustName && !rawAmount) return;

    let purchaseAmount = 0;
    if (typeof rawAmount === 'number') {
      purchaseAmount = rawAmount;
    } else if (typeof rawAmount === 'string') {
      purchaseAmount = Number(rawAmount.replace(/[^0-9.-]+/g, '')) || 0;
    }

    const rawValDate = row.getCell(2).value;
    let date = new Date().toISOString().split('T')[0];
    if (rawValDate instanceof Date) {
      date = rawValDate.toISOString().split('T')[0];
    } else if (typeof rawValDate === 'string' && rawValDate.trim()) {
      const d = new Date(rawValDate);
      if (!isNaN(d.getTime())) {
        date = d.toISOString().split('T')[0];
      }
    } else if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        date = d.toISOString().split('T')[0];
      }
    }

    let claimStatus: ClaimStatus = 'pending';
    if (rawStatus === 'disbursed' || rawStatus.includes('cair') || rawStatus.includes('lunas')) {
      claimStatus = 'disbursed';
    } else if (rawStatus === 'ready' || rawStatus.includes('siap')) {
      claimStatus = 'ready';
    }

    const payoutMethod: PayoutMethod = 'tunai';

    let isValid = true;
    let validationError = '';

    if (!rawCustName.trim()) {
      isValid = false;
      validationError = 'Nama konsumen kosong';
    } else if (purchaseAmount <= 0) {
      isValid = false;
      validationError = 'Nilai belanja Rp 0';
    }

    results.push({
      invoiceNumber: rawInvNum.trim() || `INV-${Date.now()}-${rowNumber}`,
      date,
      customerName: rawCustName.trim(),
      customerPhone: rawPhone.trim() || '08xxxxxxxx',
      purchaseAmount,
      itemsDescription: rawDesc.trim() || undefined,
      claimStatus,
      payoutMethod,
      isValid,
      validationError,
    });
  });

  return results;
}

// -------------------------------------------------------------
// MASTER CUSTOMER IMPORT TEMPLATE & PARSER
// -------------------------------------------------------------

export interface ParsedImportCustomer {
  customerCode?: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  preferredPayoutMethod: PayoutMethod;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  eWalletType?: string;
  eWalletNumber?: string;
  notes?: string;
  isValid: boolean;
  validationError?: string;
}

/**
 * Generates and downloads the official Master Customer Excel template
 */
export async function exportCustomerImportTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CashbackPro';
  wb.created = new Date();

  const ws = wb.addWorksheet('Template Master Konsumen', {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Kode Konsumen', key: 'code', width: 16 },
    { header: 'Nama Konsumen (Wajib)', key: 'name', width: 26 },
    { header: 'No. WhatsApp / HP (Wajib)', key: 'phone', width: 22 },
    { header: 'Email', key: 'email', width: 24 },
    { header: 'Kota / Domisili', key: 'city', width: 18 },
    { header: 'Alamat Lengkap', key: 'address', width: 32 },
    { header: 'Metode Pencairan', key: 'payout', width: 20 },
    { header: 'Nama Bank', key: 'bank_name', width: 16 },
    { header: 'Nomor Rekening', key: 'bank_account', width: 22 },
    { header: 'Nama Pemilik Rekening', key: 'account_holder', width: 24 },
    { header: 'Jenis E-Wallet', key: 'ewallet_type', width: 16 },
    { header: 'Nomor E-Wallet', key: 'ewallet_number', width: 20 },
    { header: 'Catatan', key: 'notes', width: 25 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF047857' }, // Emerald dark header
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  // Example sample rows with Indonesian profiles (Cash-only payout)
  const sampleRows = [
    [1, 'CUST-001', 'Fatur', '081234567890', 'fatur@example.com', 'Surabaya', 'Jl. Pemuda No. 45', 'tunai', '', '', '', '', '', 'Pelanggan setia elektronik'],
    [2, 'CUST-002', 'fabio', '085712345678', 'fabio@example.com', 'Sidoarjo', 'Ruko Graha Indah B-12', 'tunai', '', '', '', '', '', 'Member toko VIP'],
    [3, 'CUST-003', 'Hendra Wijaya', '081398765432', 'hendra@example.com', 'Gresik', 'Jl. Veteran No. 8', 'tunai', '', '', '', '', '', 'Pencairan tunai (cash)'],
    [4, 'CUST-004', 'Siti Rahmawati', '082155667788', '', 'Malang', 'Jl. Ijen No. 15', 'tunai', '', '', '', '', '', 'Toko Kelontong Berkah'],
    [5, 'CUST-005', 'Budi Santoso', '081877665544', 'budi@example.com', 'Surabaya', 'Jl. Dharmahusada No. 22', 'tunai', '', '', '', '', '', 'Ambil tunai kasir toko'],
  ];

  sampleRows.forEach((r) => {
    const row = ws.addRow(r);
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = dataFont;
      cell.border = thinBorder;
      // Text formatting for phone and accounts so zeroes are preserved
      if (colNumber === 1 || colNumber === 2 || colNumber === 8 || colNumber === 9 || colNumber === 12) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, 'Template_Import_Master_Konsumen.xlsx');
}

/**
 * Parses uploaded Excel file into CustomerMaster records
 */
export async function parseCustomersFromExcel(file: File): Promise<ParsedImportCustomer[]> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');

  const results: ParsedImportCustomer[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    // Detect if column 1 is 'No' sequence or 'Kode Konsumen'
    const col1Val = row.getCell(1).text || String(row.getCell(1).value || '');
    const col2Val = row.getCell(2).text || String(row.getCell(2).value || '');
    const isCol1Sequence = !isNaN(Number(col1Val)) && col1Val.trim().length <= 4 && col2Val.trim().length > 0;

    let rawCode = '';
    let rawName = '';
    let rawPhone = '';
    let rawEmail = '';
    let rawCity = '';
    let rawAddress = '';
    let rawPayout = '';
    let rawBankName = '';
    let rawBankAcc = '';
    let rawAccHolder = '';
    let rawEWalletType = '';
    let rawEWalletNumber = '';
    let rawNotes = '';

    if (isCol1Sequence) {
      rawCode = row.getCell(2).text || String(row.getCell(2).value || '');
      rawName = row.getCell(3).text || String(row.getCell(3).value || '');
      rawPhone = row.getCell(4).text || String(row.getCell(4).value || '');
      rawEmail = row.getCell(5).text || String(row.getCell(5).value || '');
      rawCity = row.getCell(6).text || String(row.getCell(6).value || '');
      rawAddress = row.getCell(7).text || String(row.getCell(7).value || '');
      rawPayout = (row.getCell(8).text || String(row.getCell(8).value || '')).toLowerCase().trim();
      rawBankName = row.getCell(9).text || String(row.getCell(9).value || '');
      rawBankAcc = row.getCell(10).text || String(row.getCell(10).value || '');
      rawAccHolder = row.getCell(11).text || String(row.getCell(11).value || '');
      rawEWalletType = row.getCell(12).text || String(row.getCell(12).value || '');
      rawEWalletNumber = row.getCell(13).text || String(row.getCell(13).value || '');
      rawNotes = row.getCell(14).text || String(row.getCell(14).value || '');
    } else {
      rawCode = row.getCell(1).text || String(row.getCell(1).value || '');
      rawName = row.getCell(2).text || String(row.getCell(2).value || '');
      rawPhone = row.getCell(3).text || String(row.getCell(3).value || '');
      rawEmail = row.getCell(4).text || String(row.getCell(4).value || '');
      rawCity = row.getCell(5).text || String(row.getCell(5).value || '');
      rawAddress = row.getCell(6).text || String(row.getCell(6).value || '');
      rawPayout = (row.getCell(7).text || String(row.getCell(7).value || '')).toLowerCase().trim();
      rawBankName = row.getCell(8).text || String(row.getCell(8).value || '');
      rawBankAcc = row.getCell(9).text || String(row.getCell(9).value || '');
      rawAccHolder = row.getCell(10).text || String(row.getCell(10).value || '');
      rawEWalletType = row.getCell(11).text || String(row.getCell(11).value || '');
      rawEWalletNumber = row.getCell(12).text || String(row.getCell(12).value || '');
      rawNotes = row.getCell(13).text || String(row.getCell(13).value || '');
    }

    if (!rawName.trim() && !rawPhone.trim() && !rawCode.trim()) return;

    const payoutMethod: PayoutMethod = 'tunai';

    // Clean phone number (strip spaces, dashes)
    const cleanPhone = rawPhone.trim().replace(/[\s-]/g, '');

    let isValid = true;
    let validationError = '';

    if (!rawName.trim()) {
      isValid = false;
      validationError = 'Nama konsumen wajib diisi';
    } else if (!cleanPhone) {
      isValid = false;
      validationError = 'Nomor WhatsApp / telepon wajib diisi';
    }

    results.push({
      customerCode: rawCode.trim() || undefined,
      name: rawName.trim(),
      phone: cleanPhone || '08xxxxxxxx',
      email: rawEmail.trim() || undefined,
      city: rawCity.trim() || undefined,
      address: rawAddress.trim() || undefined,
      preferredPayoutMethod: payoutMethod,
      bankName: rawBankName.trim() || undefined,
      bankAccountNumber: rawBankAcc.trim() || undefined,
      bankAccountHolder: rawAccHolder.trim() || undefined,
      eWalletType: rawEWalletType.trim() || undefined,
      eWalletNumber: rawEWalletNumber.trim() || undefined,
      notes: rawNotes.trim() || undefined,
      isValid,
      validationError,
    });
  });

  return results;
}


