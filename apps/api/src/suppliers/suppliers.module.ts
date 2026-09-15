import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from '../companies/company.entity';
import { PurchaseOrderEntity } from '../purchase-orders/purchase-order.entity';
import { PurchaseEntity } from '../purchases/purchase.entity';
import { SupplierEntity } from './supplier.entity';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { VendorsController } from './vendors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierEntity, CompanyEntity, PurchaseEntity, PurchaseOrderEntity])],
  controllers: [SuppliersController, VendorsController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
