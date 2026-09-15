import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingEntity } from '../billing/billing.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { InventoryMovementEntity } from '../inventory/inventory-movement.entity';
import { PurchaseEntity } from '../purchases/purchase.entity';
import { SaleEntity } from '../sales/sale.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleEntity,
      PurchaseEntity,
      BillingEntity,
      CustomerEntity,
      InventoryMovementEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
