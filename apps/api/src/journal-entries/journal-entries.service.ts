import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntryEntity } from './journal-entry.entity';

@Injectable()
export class JournalEntriesService {
  constructor(
    @InjectRepository(JournalEntryEntity)
    private readonly repository: Repository<JournalEntryEntity>,
  ) {}

  findAll(filters: { billingId?: number; purchaseOrderId?: number; companyId?: number }) {
    const query = this.repository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.billing', 'billing')
      .leftJoinAndSelect('entry.purchaseOrder', 'purchaseOrder')
      .leftJoinAndSelect('entry.company', 'company');

    if (filters.billingId) query.andWhere('entry.billingId = :billingId', { billingId: filters.billingId });
    if (filters.purchaseOrderId) query.andWhere('entry.purchaseOrderId = :purchaseOrderId', { purchaseOrderId: filters.purchaseOrderId });
    if (filters.companyId) query.andWhere('entry.companyId = :companyId', { companyId: filters.companyId });

    return query.orderBy('entry.entryDate', 'DESC').addOrderBy('entry.id', 'DESC').getMany();
  }
}
