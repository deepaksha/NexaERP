import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('epr_filing_events')
export class EprFilingEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'epr_registration_id' })
  eprRegistrationId!: number;

  @Column({ name: 'filing_period' })
  filingPeriod!: string;

  @Column({ name: 'filing_type' })
  filingType!: string;

  @Column({ name: 'filing_status' })
  filingStatus!: string;

  @Column({ name: 'acknowledgement_number', nullable: true })
  acknowledgementNumber?: string;

  @Column({ type: 'timestamp', name: 'submitted_on', nullable: true })
  submittedOn?: Date;

  @Column({ type: 'date', name: 'due_on', nullable: true })
  dueOn?: string;

  @Column({ type: 'jsonb', name: 'filing_payload', nullable: true })
  filingPayload?: Record<string, unknown>;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
