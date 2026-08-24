import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProfitReportQueryDto } from '../reports/dto/profit-report-query.dto';
import { SalesReportQueryDto } from '../reports/dto/sales-report-query.dto';
import { ExportsService } from './exports.service';

@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('reports/sales.xlsx')
  async salesXlsx(@Query() query: SalesReportQueryDto, @Res() res: Response) {
    const file = await this.exportsService.salesXlsx(query);
    this.sendFile(res, file);
  }

  @Get('reports/profit.xlsx')
  async profitXlsx(@Query() query: ProfitReportQueryDto, @Res() res: Response) {
    const file = await this.exportsService.profitXlsx(query);
    this.sendFile(res, file);
  }

  @Get('reports/sales.pdf')
  async salesPdf(@Query() query: SalesReportQueryDto, @Res() res: Response) {
    const file = await this.exportsService.salesPdf(query);
    this.sendFile(res, file);
  }

  @Get('reports/profit.pdf')
  async profitPdf(@Query() query: ProfitReportQueryDto, @Res() res: Response) {
    const file = await this.exportsService.profitPdf(query);
    this.sendFile(res, file);
  }

  private sendFile(
    res: Response,
    file: { filename: string; contentType: string; buffer: Buffer },
  ) {
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }
}
