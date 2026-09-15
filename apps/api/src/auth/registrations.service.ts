import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationEntity } from './registration.entity';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(RegistrationEntity)
    private readonly repository: Repository<RegistrationEntity>,
  ) {}

  findAll() {
    return this.repository.find({ relations: ['requestedRole'] });
  }

  async findOne(id: number) {
    const item = await this.repository.findOne({
      where: { id },
      relations: ['requestedRole'],
    });

    if (!item) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    return item;
  }

  create(data: Partial<RegistrationEntity>) {
    const item = this.repository.create(data);
    return this.repository.save(item);
  }

  async update(id: number, data: Partial<RegistrationEntity>) {
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
