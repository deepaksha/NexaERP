import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BrokerEntity } from '../brokers/broker.entity';
import { CompanyEntity } from '../companies/company.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { PurchaseOrderEntity } from '../purchase-orders/purchase-order.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';

@Entity('billings')
export class BillingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber!: string;

  @Column({ type: 'date', name: 'invoice_date' })
  invoiceDate!: string;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate?: string;

  @Column({ name: 'bill_type', default: 'SALE' })
  billType!: string;

  @Column({ name: 'company_id', nullable: true })
  companyId?: number;

  @ManyToOne(() => CompanyEntity, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: CompanyEntity;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: number;

  @ManyToOne(() => CustomerEntity, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId?: number;

  @ManyToOne(() => SupplierEntity, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: SupplierEntity;

  @Column({ name: 'purchase_order_id', nullable: true })
  purchaseOrderId?: number;

  @ManyToOne(() => PurchaseOrderEntity, { nullable: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder?: PurchaseOrderEntity;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'gst_amount' })
  gstAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'transport_charges' })
  transportCharges!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'other_charges' })
  otherCharges!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'paid_amount' })
  paidAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'balance_amount' })
  balanceAmount!: number;

  @Column({ name: 'broker_id', nullable: true })
  brokerId?: number;

  @ManyToOne(() => BrokerEntity, { nullable: true })
  @JoinColumn({ name: 'broker_id' })
  broker?: BrokerEntity;

  @Column({ name: 'brokerage_type', nullable: true })
  brokerageType?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'brokerage_value' })
  brokerageValue!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'brokerage_amount' })
  brokerageAmount!: number;

  @Column({ name: 'original_bill_attachment_url', type: 'text', nullable: true })
  originalBillAttachmentUrl?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'original_bill_amount' })
  originalBillAmount!: number;

  @Column({ name: 'journal_narration', type: 'text', nullable: true })
  journalNarration?: string;

  @Column({ default: 'Draft' })
  status!: string;

  @Column({ name: 'payment_status', default: 'Pending' })
  paymentStatus!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt!: Date;
}
