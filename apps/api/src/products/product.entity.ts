import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompanyEntity } from '../companies/company.entity';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  sku!: string;

  @Column()
  category!: string;

  @ManyToOne(() => CompanyEntity, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: CompanyEntity;

  @Column({ name: 'company_id', nullable: true })
  companyId?: number;

  @Column({ default: 0 })
  stock!: number;

  @Column({ name: 'lowstockthreshold', default: 15 })
  lowStockThreshold!: number;

  @Column({ default: 'Active' })
  status!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
