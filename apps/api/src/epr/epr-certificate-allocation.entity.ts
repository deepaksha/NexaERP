import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('epr_certificate_allocations')
export class EprCertificateAllocationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'certificate_id' })
  certificateId!: number;

  @Column({ name: 'epr_obligation_id' })
  eprObligationId!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, name: 'allocated_quantity_mt' })
  allocatedQuantityMt!: number;

  @Column({ type: 'date', name: 'allocation_date' })
  allocationDate!: string;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
