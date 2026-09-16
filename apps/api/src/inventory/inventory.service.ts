import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryMovementEntity } from './inventory-movement.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryMovementEntity)
    private readonly repository: Repository<InventoryMovementEntity>,
  ) {}

  findAll(companyId?: number) {
    const query = this.repository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.company', 'company');

    if (companyId) {
      query.where('movement.companyId = :companyId', { companyId });
    }

    return query.orderBy('movement.createdAt', 'DESC').getMany();
  }

  create(data: Partial<InventoryMovementEntity>) {
    const movement = this.repository.create(data);
    return this.repository.save(movement);
  }
}
