import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from '../companies/company.entity';
import { BrokerEntity } from './broker.entity';
import { BrokersController } from './brokers.controller';
import { BrokersService } from './brokers.service';

@Module({
  imports: [TypeOrmModule.forFeature([BrokerEntity, CompanyEntity])],
  controllers: [BrokersController],
  providers: [BrokersService],
  exports: [BrokersService],
})
export class BrokersModule {}
