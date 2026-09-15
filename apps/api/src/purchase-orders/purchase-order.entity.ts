import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompanyEntity } from '../companies/company.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';

@Entity('purchase_orders')
export class PurchaseOrderEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'po_number', unique: true })
  poNumber!: string;

  @Column({ type: 'date', name: 'po_date' })
  poDate!: string;

  @Column({ type: 'date', name: 'expected_delivery_date', nullable: true })
  expectedDeliveryDate?: string;

  @Column({ name: 'request_number', nullable: true })
  requestNumber?: string;

  @Column({ name: 'company_id' })
  companyId!: number;

  @ManyToOne(() => CompanyEntity, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyEntity;

  @Column({ name: 'supplier_id' })
  supplierId!: number;

  @ManyToOne(() => SupplierEntity, { nullable: false })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: SupplierEntity;

  @Column({ name: 'item_description', type: 'text' })
  itemDescription!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  items!: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitPrice!: number;

  @Column({ name: 'transport_charges', type: 'decimal', precision: 10, scale: 2, default: 0 })
  transportCharges!: number;

  @Column({ name: 'other_charges', type: 'decimal', precision: 10, scale: 2, default: 0 })
  otherCharges!: number;

  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotalAmount!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ default: 'Draft' })
  status!: string;

  @Column({ name: 'approval_required_role', default: 'purchase-manager' })
  approvalRequiredRole!: string;

  @Column({ name: 'approved_by_role', nullable: true })
  approvedByRole?: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'approval_notes', type: 'text', nullable: true })
  approvalNotes?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
