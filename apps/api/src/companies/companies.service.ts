import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyEntity } from './company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly repository: Repository<CompanyEntity>,
  ) {}

  findAll() {
    return this.repository.find({
      relations: ['parentCompany'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const company = await this.repository.findOne({
      where: { id },
      relations: ['parentCompany'],
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  create(data: Partial<CompanyEntity>) {
    if (!data.name || !String(data.name).trim()) {
      throw new Error('Company name is required');
    }

    const company = this.repository.create(data);
    return this.repository.save(company);
  }

  async update(id: number, data: Partial<CompanyEntity>) {
    const company = await this.findOne(id);
    Object.assign(company, data);
    return this.repository.save(company);
  }

  async remove(id: number) {
    const company = await this.findOne(id);
    await this.repository.remove(company);
    return { deleted: true, id };
  }
}
