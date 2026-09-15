import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BillingEntity } from '../billing/billing.entity';
import { CompanyEntity } from '../companies/company.entity';
import { PurchaseOrderEntity } from '../purchase-orders/purchase-order.entity';

@Entity('journal_entries')
export class JournalEntryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'billing_id' })
  billingId!: number;

  @ManyToOne(() => BillingEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'billing_id' })
  billing!: BillingEntity;

  @Column({ name: 'purchase_order_id', nullable: true })
  purchaseOrderId?: number;

  @ManyToOne(() => PurchaseOrderEntity, { nullable: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder?: PurchaseOrderEntity;

  @Column({ name: 'company_id', nullable: true })
  companyId?: number;

  @ManyToOne(() => CompanyEntity, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: CompanyEntity;

  @Column({ type: 'date', name: 'entry_date' })
  entryDate!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'debit_amount', default: 0 })
  debitAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'credit_amount', default: 0 })
  creditAmount!: number;

  @Column({ type: 'text', nullable: true })
  narration?: string;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
