import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrokerEntity } from '../brokers/broker.entity';
import { InventoryMovementEntity } from '../inventory/inventory-movement.entity';
import { ProductEntity } from '../products/product.entity';
import { SaleItemEntity } from './sale-item.entity';
import { SalePaymentEntity } from './sale-payment.entity';
import { SaleEntity } from './sale.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleEntity,
      SaleItemEntity,
      SalePaymentEntity,
      ProductEntity,
      InventoryMovementEntity,
      BrokerEntity,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
