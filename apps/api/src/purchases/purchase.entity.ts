import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompanyEntity } from '../companies/company.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';

@Entity('purchases')
export class PurchaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  invoiceNumber!: string;

  @Column({ type: 'date' })
  purchaseDate!: string;

  @Column({ nullable: true })
  productName?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId?: number;

  @ManyToOne(() => SupplierEntity, (supplier) => supplier.purchases, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: SupplierEntity;

  @Column({ name: 'company_id', nullable: true })
  companyId?: number;

  @ManyToOne(() => CompanyEntity, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: CompanyEntity;

  @Column({ default: 'Paid' })
  paymentStatus!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
