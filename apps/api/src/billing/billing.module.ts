import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrokerEntity } from '../brokers/broker.entity';
import { CompanyEntity } from '../companies/company.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { JournalEntryEntity } from '../journal-entries/journal-entry.entity';
import { PurchaseOrderEntity } from '../purchase-orders/purchase-order.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';
import { BillingEntity } from './billing.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillingEntity,
      CompanyEntity,
      CustomerEntity,
      SupplierEntity,
      PurchaseOrderEntity,
      BrokerEntity,
      JournalEntryEntity,
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
