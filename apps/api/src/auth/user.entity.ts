import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CompanyEntity } from '../companies/company.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  fullName!: string;

  @Column({ nullable: true })
  phone?: string;

  @ManyToOne(() => CompanyEntity, (company) => company.users, { nullable: true, eager: true })
  @JoinColumn({ name: 'company_id' })
  company?: CompanyEntity;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isDeleted!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user, { cascade: true })
  roles!: UserRoleEntity[];
}
