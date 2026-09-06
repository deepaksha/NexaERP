import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ default: 0 })
  stock!: number;

  @Column({ default: 'Active' })
  status!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
