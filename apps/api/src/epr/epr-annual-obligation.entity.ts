import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('epr_annual_obligations')
export class EprAnnualObligationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'epr_registration_id' })
  eprRegistrationId!: number;

  @Column({ name: 'obligation_year' })
  obligationYear!: string;

  @Column({ name: 'material_category_id' })
  materialCategoryId!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, name: 'target_quantity_mt' })
  targetQuantityMt!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, name: 'carry_forward_mt', default: 0 })
  carryForwardMt!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, name: 'total_obligation_mt', select: false })
  totalObligationMt!: number;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
