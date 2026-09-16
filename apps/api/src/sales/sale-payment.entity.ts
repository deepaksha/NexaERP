import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SaleEntity } from './sale.entity';

@Entity('sale_payments')
export class SalePaymentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'sale_id' })
  saleId!: number;

  @ManyToOne(() => SaleEntity, (sale) => sale.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale!: SaleEntity;

  @Column({ name: 'receipt_number' })
  receiptNumber!: string;

  @Column({ name: 'payment_type', default: 'Cash' })
  paymentType!: string;

  @Column({ name: 'payment_reference', nullable: true })
  paymentReference?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount!: number;

  @Column({ name: 'payment_date_time', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  paymentDateTime!: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
