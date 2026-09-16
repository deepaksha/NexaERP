import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageAccessEntity } from './page-access.entity';

@Injectable()
export class PageAccessService {
  constructor(
    @InjectRepository(PageAccessEntity)
    private readonly pageAccessRepository: Repository<PageAccessEntity>,
  ) {}

  async getPageAccessByRole(roleId: number) {
    return this.pageAccessRepository.find({
      where: { role: { id: roleId } },
      relations: ['role'],
    });
  }

  async canAccess(roleIds: number[], pageKey: string, action: 'view' | 'create' | 'edit' | 'delete') {
    const permissions = await this.pageAccessRepository.find({
      where: roleIds.map((roleId) => ({ role: { id: roleId } })),
      relations: ['role'],
    });

    return permissions.some((pageAccess) => {
      if (pageAccess.pageKey !== pageKey) return false;
      const checks = {
        view: pageAccess.canView,
        create: pageAccess.canCreate,
        edit: pageAccess.canEdit,
        delete: pageAccess.canDelete,
      };
      return checks[action] === true;
    });
  }
}
