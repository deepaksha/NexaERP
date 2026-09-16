import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from './role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  findAll() {
    return this.repository.find({
      relations: ['userRoles', 'permissions', 'registrations'],
    });
  }

  async findOne(id: number) {
    const item = await this.repository.findOne({
      where: { id },
      relations: ['userRoles', 'permissions', 'registrations'],
    });

    if (!item) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return item;
  }

  create(data: Partial<RoleEntity>) {
    const item = this.repository.create(data);
    return this.repository.save(item);
  }

  async update(id: number, data: Partial<RoleEntity>) {
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
