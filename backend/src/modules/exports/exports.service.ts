import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import { ProfitReportQueryDto } from '../reports/dto/profit-report-query.dto';
import { SalesReportQueryDto } from '../reports/dto/sales-report-query.dto';
import { ReportsService } from '../reports/reports.service';

type ExportFile = {
  filename: string;
  contentType: string;
  buffer: Buffer;
};

type SalesReport = Awaited<ReturnType<ReportsService['sales']>>;
type ProfitReport = Awaited<ReturnType<ReportsService['profit']>>;

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_CONTENT_TYPE = 'application/pdf';

@Injectable()
export class ExportsService {
  constructor(private readonly reportsService: ReportsService) {}

  async salesXlsx(query: SalesReportQueryDto): Promise<ExportFile> {
    const report = await this.fullSalesReport(query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Laporan Penjualan');
    this.addMetadataRows(sheet, 'Laporan Penjualan', report.filters);

    sheet.addRow([]);
    sheet.addRow(['Ringkasan']);
    this.addKeyValueRows(sheet, report.summary);
    sheet.addRow([]);
    sheet.addRow([
      'Nomor Transaksi',
      'Tanggal',
      'Kasir',
      'Metode',
      'Subtotal',
      'Diskon',
      'Total',
      'Retur',
      'Net Revenue',
      'Status Retur',
    ]);
    for (const row of report.data) {
      sheet.addRow([
        row.saleNumber,
        row.saleDate,
        row.cashier.name,
        row.paymentMethod,
        row.subtotal,
        row.discountTotal,
        row.grandTotal,
        row.returnTotal,
        row.netTotal,
        row.returnStatus,
      ]);
    }
    this.autosize(sheet);

    return {
      filename: this.filename('laporan-penjualan', 'xlsx'),
      contentType: XLSX_CONTENT_TYPE,
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    };
  }

  async profitXlsx(query: ProfitReportQueryDto): Promise<ExportFile> {
    const report = await this.fullProfitReport(query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Laporan Laba');
    this.addMetadataRows(sheet, 'Laporan Laba', report.filters);

    sheet.addRow([]);
    sheet.addRow(['Ringkasan']);
    this.addKeyValueRows(sheet, report.summary);
    sheet.addRow([]);
    sheet.addRow([
      'Transaksi',
      'Tanggal',
      'Produk',
      'Batch',
      'Qty Base',
      'Revenue',
      'Diskon',
      'HPP',
      'Gross Profit',
      'Return Revenue',
      'Return HPP',
      'Return Profit',
      'Net Profit',
      'Profit Display',
    ]);
    for (const row of report.data) {
      sheet.addRow([
        row.saleNumber,
        row.saleDate,
        row.productName,
        row.batchNumber,
        row.qtyBase,
        row.grossRevenue,
        row.discountAmount,
        row.hppAmount,
        row.grossProfit,
        row.returnRevenue,
        row.returnHpp,
        row.returnProfit,
        row.netProfit,
        row.profitDisplay,
      ]);
    }
    this.autosize(sheet);

    return {
      filename: this.filename('laporan-laba', 'xlsx'),
      contentType: XLSX_CONTENT_TYPE,
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    };
  }

  async salesPdf(query: SalesReportQueryDto): Promise<ExportFile> {
    const report = await this.fullSalesReport(query);
    const buffer = await this.buildPdf('Laporan Penjualan', report, [
      ['Transaksi', 'Tanggal', 'Kasir', 'Total', 'Retur', 'Net'],
      ...report.data.map((row) => [
        row.saleNumber,
        row.saleDate.slice(0, 10),
        row.cashier.name,
        String(row.grandTotal),
        String(row.returnTotal),
        String(row.netTotal),
      ]),
    ]);

    return {
      filename: this.filename('laporan-penjualan', 'pdf'),
      contentType: PDF_CONTENT_TYPE,
      buffer,
    };
  }

  async profitPdf(query: ProfitReportQueryDto): Promise<ExportFile> {
    const report = await this.fullProfitReport(query);
    const buffer = await this.buildPdf('Laporan Laba', report, [
      ['Transaksi', 'Produk', 'Batch', 'Revenue', 'HPP', 'Net Profit'],
      ...report.data.map((row) => [
        row.saleNumber,
        row.productName,
        row.batchNumber,
        String(row.grossRevenue),
        String(row.hppAmount),
        String(row.netProfit),
      ]),
    ]);

    return {
      filename: this.filename('laporan-laba', 'pdf'),
      contentType: PDF_CONTENT_TYPE,
      buffer,
    };
  }

  private async fullSalesReport(query: SalesReportQueryDto) {
    const firstPage = await this.reportsService.sales({ ...query, page: 1, limit: 1 });
    return this.reportsService.sales({
      ...query,
      page: 1,
      limit: Math.max(firstPage.pagination.total, 1),
    });
  }

  private async fullProfitReport(query: ProfitReportQueryDto) {
    const firstPage = await this.reportsService.profit({ ...query, page: 1, limit: 1 });
    return this.reportsService.profit({
      ...query,
      page: 1,
      limit: Math.max(firstPage.pagination.total, 1),
    });
  }

  private addMetadataRows(
    sheet: ExcelJS.Worksheet,
    title: string,
    filters: Record<string, unknown>,
  ) {
    sheet.addRow([title]);
    sheet.addRow(['Diekspor Pada', new Date().toISOString()]);
    sheet.addRow(['Periode Mulai', filters.startAt]);
    sheet.addRow(['Periode Selesai', filters.endAt]);
    sheet.addRow(['Filter', this.filterSummary(filters)]);
  }

  private addKeyValueRows(sheet: ExcelJS.Worksheet, values: Record<string, unknown>) {
    for (const [key, value] of Object.entries(values)) {
      sheet.addRow([key, value]);
    }
  }

  private async buildPdf(
    title: string,
    report: SalesReport | ProfitReport,
    rows: string[][],
  ) {
    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({ margin: 36, size: 'A4' });
      const chunks: Buffer[] = [];

      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      document.fontSize(16).text(title);
      document.moveDown(0.5);
      document.fontSize(9).text(`Diekspor Pada: ${new Date().toISOString()}`);
      document.text(`Periode Mulai: ${report.filters.startAt}`);
      document.text(`Periode Selesai: ${report.filters.endAt}`);
      document.text(`Filter: ${this.filterSummary(report.filters)}`);
      document.moveDown();

      document.fontSize(11).text('Ringkasan');
      document.fontSize(8);
      for (const [key, value] of Object.entries(report.summary)) {
        document.text(`${key}: ${value}`);
      }
      document.moveDown();

      document.fontSize(9).text('Detail');
      document.fontSize(7);
      for (const row of rows) {
        document.text(row.join(' | '), { lineGap: 2 });
      }

      document.end();
    });
  }

  private filterSummary(filters: Record<string, unknown>) {
    return Object.entries(filters)
      .filter(([key]) => !['startAt', 'endAt', 'page', 'limit'].includes(key))
      .map(([key, value]) => `${key}=${value}`)
      .join(', ') || '-';
  }

  private filename(prefix: string, extension: 'xlsx' | 'pdf') {
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${prefix}-${timestamp}.${extension}`;
  }

  private autosize(sheet: ExcelJS.Worksheet) {
    sheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell?.((cell) => {
        maxLength = Math.max(maxLength, String(cell.value ?? '').length + 2);
      });
      column.width = Math.min(maxLength, 40);
    });
  }
}
