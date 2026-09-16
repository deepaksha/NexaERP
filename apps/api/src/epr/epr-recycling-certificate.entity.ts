import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('epr_recycling_certificates')
export class EprRecyclingCertificateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'certificate_number', unique: true })
  certificateNumber!: string;

  @Column({ name: 'issuer_party_id' })
  issuerPartyId!: number;

  @Column({ name: 'beneficiary_party_id' })
  beneficiaryPartyId!: number;

  @Column({ name: 'material_category_id' })
  materialCategoryId!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, name: 'certificate_quantity_mt' })
  certificateQuantityMt!: number;

  @Column({ type: 'date', name: 'issue_date' })
  issueDate!: string;

  @Column({ type: 'date', name: 'valid_from', nullable: true })
  validFrom?: string;

  @Column({ type: 'date', name: 'valid_to', nullable: true })
  validTo?: string;

  @Column({ name: 'status_code', default: 'ACTIVE' })
  statusCode!: string;

  @Column({ name: 'evidence_attachment_id', nullable: true })
  evidenceAttachmentId?: number;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
