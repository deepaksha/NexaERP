import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageAccessController } from './page-access.controller';
import { PageAccessEntity } from './page-access.entity';
import { PageAccessService } from './page-access.service';
import { PermissionEntity } from './permission.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RegistrationEntity } from './registration.entity';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { RoleEntity } from './role.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UserEntity } from './user.entity';
import { UserRoleEntity } from './user-role.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
      UserRoleEntity,
      RegistrationEntity,
      PageAccessEntity,
    ]),
  ],
  controllers: [
    UsersController,
    RolesController,
    PermissionsController,
    RegistrationsController,
    PageAccessController,
  ],
  providers: [
    UsersService,
    RolesService,
    PermissionsService,
    RegistrationsService,
    PageAccessService,
  ],
  exports: [TypeOrmModule],
})
export class AuthModule {}
