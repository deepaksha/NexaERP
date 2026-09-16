import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('epr_registrations')
export class EprRegistrationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'registrant_party_id' })
  registrantPartyId!: number;

  @Column({ name: 'epr_role_id' })
  eprRoleId!: number;

  @Column({ name: 'registration_number', unique: true })
  registrationNumber!: string;

  @Column({ name: 'registration_authority', default: 'CPCB' })
  registrationAuthority!: string;

  @Column({ name: 'registration_status', default: 'ACTIVE' })
  registrationStatus!: string;

  @Column({ type: 'date', name: 'issue_date', nullable: true })
  issueDate?: string;

  @Column({ type: 'date', name: 'expiry_date', nullable: true })
  expiryDate?: string;

  @Column({ name: 'certificate_attachment_id', nullable: true })
  certificateAttachmentId?: number;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
