import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RegistrationEntity } from './registration.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity('application_roles')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.role, { cascade: true })
  userRoles!: UserRoleEntity[];

  @OneToMany(() => RolePermissionEntity, (permission) => permission.role, {
    cascade: true,
  })
  permissions!: RolePermissionEntity[];

  @OneToMany(() => RegistrationEntity, (registration) => registration.requestedRole, {
    cascade: true,
  })
  registrations!: RegistrationEntity[];
}
