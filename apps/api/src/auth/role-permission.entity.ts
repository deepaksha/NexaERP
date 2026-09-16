import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PermissionEntity } from './permission.entity';
import { RoleEntity } from './role.entity';

@Entity('role_permissions')
export class RolePermissionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => RoleEntity, (role) => role.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  @ManyToOne(() => PermissionEntity, (permission) => permission.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission!: PermissionEntity;

  @Column({ default: true })
  allowed!: boolean;
}
