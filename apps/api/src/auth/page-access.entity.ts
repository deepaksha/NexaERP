import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RoleEntity } from './role.entity';

@Entity('page_access')
export class PageAccessEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  pageKey!: string;

  @Column()
  pageName!: string;

  @Column({ default: 'view' })
  defaultAccess!: string;

  @ManyToOne(() => RoleEntity, { eager: true, nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role?: RoleEntity;

  @Column({ default: false })
  canView!: boolean;

  @Column({ default: false })
  canCreate!: boolean;

  @Column({ default: false })
  canEdit!: boolean;

  @Column({ default: false })
  canDelete!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
