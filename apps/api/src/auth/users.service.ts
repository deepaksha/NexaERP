import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findAll() {
    return this.repository.find({ relations: ['roles'] });
  }

  async findOne(id: number) {
    const item = await this.repository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!item) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return item;
  }

  create(data: Partial<UserEntity>) {
    const item = this.repository.create(data);
    return this.repository.save(item);
  }

  async update(id: number, data: Partial<UserEntity>) {
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
