import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../products/product.entity';
import { ProductRateEntity } from './product-rate.entity';
import { ProductRatesController } from './product-rates.controller';
import { ProductRatesService } from './product-rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductRateEntity, ProductEntity])],
  controllers: [ProductRatesController],
  providers: [ProductRatesService],
  exports: [ProductRatesService],
})
export class ProductRatesModule {}
