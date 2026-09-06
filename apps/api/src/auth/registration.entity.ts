import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RoleEntity } from './role.entity';

export enum RegistrationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('registrations')
export class RegistrationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  fullName!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  companyName?: string;

  @ManyToOne(() => RoleEntity, (role) => role.registrations, { nullable: true, eager: true })
  @JoinColumn({ name: 'requested_role_id' })
  requestedRole?: RoleEntity;

  @Column({ type: 'varchar', default: RegistrationStatus.PENDING })
  status!: RegistrationStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ nullable: true })
  reviewedBy?: string;

  @Column({ nullable: true })
  notes?: string;
}
