import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from './permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly repository: Repository<PermissionEntity>,
  ) {}

  findAll() {
    return this.repository.find({ relations: ['rolePermissions'] });
  }

  async findOne(id: number) {
    const item = await this.repository.findOne({
      where: { id },
      relations: ['rolePermissions'],
    });

    if (!item) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return item;
  }

  create(data: Partial<PermissionEntity>) {
    const item = this.repository.create(data);
    return this.repository.save(item);
  }

  async update(id: number, data: Partial<PermissionEntity>) {
    const item = await this.findOne(id);
    Object.assign(item, data);
    return this.repository.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.repository.remove(item);
    return { deleted: true, id };
  }
}
