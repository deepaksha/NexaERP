import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../auth/role.entity';
import { UserRoleEntity } from '../auth/user-role.entity';
import { UserEntity } from '../auth/user.entity';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserEntity, UserRoleEntity, RoleEntity])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
