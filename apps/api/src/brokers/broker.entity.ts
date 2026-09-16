import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompanyEntity } from '../companies/company.entity';

@Entity('brokers')
export class BrokerEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ name: 'contact_person', nullable: true })
  contactPerson?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ name: 'company_id', nullable: true })
  companyId?: number;

  @ManyToOne(() => CompanyEntity, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: CompanyEntity;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: 'Active' })
  status!: string;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
