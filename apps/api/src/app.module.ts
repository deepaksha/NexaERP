import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { BrokersModule } from './brokers/brokers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { InventoryModule } from './inventory/inventory.module';
import { JournalEntriesModule } from './journal-entries/journal-entries.module';
import { CustomersModule } from './customers/customers.module';
import { SalesModule } from './sales/sales.module';
import { BillingModule } from './billing/billing.module';
import { ReportsModule } from './reports/reports.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ProductRatesModule } from './product-rates/product-rates.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'erpuser'),
        password: configService.get<string>('DB_PASSWORD', 'erpsecret'),
        database: configService.get<string>('DB_NAME', 'erpdb'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: false,
      }),
    }),
    AuthModule,
    ProductsModule,
    CompaniesModule,
    BrokersModule,
    SuppliersModule,
    PurchasesModule,
    InventoryModule,
    JournalEntriesModule,
    CustomersModule,
    SalesModule,
    BillingModule,
    PurchaseOrdersModule,
    ReportsModule,
    ProductRatesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
