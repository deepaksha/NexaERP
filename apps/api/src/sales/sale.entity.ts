import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BrokerEntity } from '../brokers/broker.entity';
import { CompanyEntity } from '../companies/company.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { ProductEntity } from '../products/product.entity';
import { SaleItemEntity } from './sale-item.entity';
import { SalePaymentEntity } from './sale-payment.entity';

@Entity('sales')
export class SaleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  invoiceNumber!: string;

  @Column({ type: 'date' })
  saleDate!: string;

  @Column()
  productName!: string;

  @Column({ name: 'product_id', nullable: true })
  productId?: number;

  @ManyToOne(() => ProductEntity, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount!: number;

  @Column({ name: 'balance_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  balanceAmount!: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: number;

  @ManyToOne(() => CustomerEntity, (customer) => customer.sales, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity;

  @Column({ name: 'company_id', nullable: true })
  companyId?: number;

  @ManyToOne(() => CompanyEntity, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: CompanyEntity;

  @Column({ default: 'Paid' })
  paymentStatus!: string;

  @Column({ name: 'payment_type', default: 'Cash' })
  paymentType!: string;

  @Column({ name: 'broker_id', nullable: true })
  brokerId?: number;

  @ManyToOne(() => BrokerEntity, { nullable: true })
  @JoinColumn({ name: 'broker_id' })
  broker?: BrokerEntity;

  @Column({ name: 'brokerage_type', nullable: true })
  brokerageType?: string;

  @Column({ name: 'brokerage_value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  brokerageValue!: number;

  @Column({ name: 'brokerage_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  brokerageAmount!: number;

  @Column({ type: 'timestamp', name: 'sale_date_time', default: () => 'CURRENT_TIMESTAMP' })
  saleDateTime!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @OneToMany(() => SaleItemEntity, (item) => item.sale)
  items!: SaleItemEntity[];

  @OneToMany(() => SalePaymentEntity, (payment) => payment.sale)
  payments!: SalePaymentEntity[];
}
