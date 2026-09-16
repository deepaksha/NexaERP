import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolePermissionEntity } from './role-permission.entity';

@Entity('permissions')
export class PermissionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.permission, {
    cascade: true,
  })
  rolePermissions!: RolePermissionEntity[];
}
