import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedCompanyId = companyId && companyId !== 'all' ? Number(companyId) : undefined;
    return this.reportsService.getSummary(parsedCompanyId, startDate, endDate);
  }

  @Get('transactions')
  getTransactions(
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedCompanyId = companyId && companyId !== 'all' ? Number(companyId) : undefined;
    return this.reportsService.getTransactions(parsedCompanyId, startDate, endDate);
  }
}
