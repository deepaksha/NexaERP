import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../auth/user.entity';

@Entity('companies')
export class CompanyEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true, nullable: true })
  code?: string;

  @Column({ nullable: true })
  shortName?: string;

  @Column({ nullable: true })
  gstNumber?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ name: 'parent_company_id', nullable: true })
  parentCompanyId?: number;

  @ManyToOne(() => CompanyEntity, (company) => company.children, { nullable: true })
  @JoinColumn({ name: 'parent_company_id' })
  parentCompany?: CompanyEntity;

  @OneToMany(() => CompanyEntity, (company) => company.parentCompany)
  children!: CompanyEntity[];

  @Column({ default: 'Active' })
  status!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => UserEntity, (user) => user.company)
  users!: UserEntity[];
}
