import { Controller, Get, Query } from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';

@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  findAll(
    @Query('billingId') billingId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('companyId') companyId?: string,
  ) {
    const parsedBillingId = billingId ? Number(billingId) : undefined;
    const parsedPurchaseOrderId = purchaseOrderId ? Number(purchaseOrderId) : undefined;
    const parsedCompanyId = companyId ? Number(companyId) : undefined;

    return this.journalEntriesService.findAll({
      billingId: Number.isFinite(parsedBillingId) ? parsedBillingId : undefined,
      purchaseOrderId: Number.isFinite(parsedPurchaseOrderId) ? parsedPurchaseOrderId : undefined,
      companyId: Number.isFinite(parsedCompanyId) ? parsedCompanyId : undefined,
    });
  }
}
