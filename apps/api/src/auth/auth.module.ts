import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from './permission.entity';
import { RegistrationEntity } from './registration.entity';
import { RoleEntity } from './role.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { UserEntity } from './user.entity';
import { UserRoleEntity } from './user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
      UserRoleEntity,
      RegistrationEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class AuthModule {}
