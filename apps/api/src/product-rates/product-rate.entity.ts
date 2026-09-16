import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ProductEntity } from '../products/product.entity';

@Entity('product_rates')
@Unique('uq_product_rate_day', ['productId', 'rateDate'])
export class ProductRateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id' })
  productId!: number;

  @ManyToOne(() => ProductEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({ type: 'date', name: 'rate_date' })
  rateDate!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rate!: number;

  @Column({ default: 'Government' })
  source!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
