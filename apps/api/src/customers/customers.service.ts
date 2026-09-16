import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyEntity } from '../companies/company.entity';
import { CustomerEntity } from './customer.entity';

const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;
const phonePattern = /^(\+91[\s-]?)?[6-9]\d{9}$/;

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly repository: Repository<CustomerEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companiesRepository: Repository<CompanyEntity>,
  ) {}

  findAll(companyId?: number) {
    const query = this.repository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.company', 'company');

    if (companyId) {
      query.where('customer.companyId = :companyId', { companyId });
    }

    return query.orderBy('customer.createdAt', 'DESC').getMany();
  }

  async findOne(id: number) {
    const customer = await this.repository.findOne({ where: { id }, relations: ['company'] });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  private async validateAndNormalize(
    data: Partial<CustomerEntity>,
    current?: CustomerEntity,
  ): Promise<Partial<CustomerEntity>> {
    const name = (data.name ?? current?.name ?? '').trim();
    const phone = (data.phone ?? current?.phone ?? '').trim();
    const email = (data.email ?? current?.email ?? '').trim();
    const gstNumber = (data.gstNumber ?? current?.gstNumber ?? '').trim().toUpperCase();
    const address = data.address === undefined ? current?.address : data.address?.trim() || undefined;
    const city = data.city === undefined ? current?.city : data.city?.trim() || undefined;
    const state = data.state === undefined ? current?.state : data.state?.trim() || undefined;
    const country =
      data.country === undefined
        ? current?.country || 'India'
        : data.country?.trim() || 'India';
    const companyIdRaw = data.companyId ?? current?.companyId;
    const status = data.status ?? current?.status ?? 'Active';

    if (name.length < 2) {
      throw new BadRequestException('Customer name must be at least 2 characters');
    }

    if (companyIdRaw === undefined || companyIdRaw === null) {
      throw new BadRequestException('Company is required');
    }

    const companyId = Number(companyIdRaw);
    if (!Number.isInteger(companyId) || companyId <= 0) {
      throw new BadRequestException('Company is required');
    }

    const company = await this.companiesRepository.findOne({ where: { id: companyId } });
    if (!company) {
      throw new BadRequestException('Selected company does not exist');
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('Email format is invalid');
    }

    if (phone && !phonePattern.test(phone)) {
      throw new BadRequestException('Phone must be a valid Indian mobile number');
    }

    if (gstNumber && !gstPattern.test(gstNumber)) {
      throw new BadRequestException('GST number format is invalid');
    }

    return {
      name,
      phone: phone || undefined,
      email: email || undefined,
      gstNumber: gstNumber || undefined,
      address,
      city,
      state,
      country,
      companyId,
      status,
    };
  }

  async create(data: Partial<CustomerEntity>) {
    const normalized = await this.validateAndNormalize(data);
    return this.repository.save(this.repository.create(normalized));
  }

  async update(id: number, data: Partial<CustomerEntity>) {
    const customer = await this.findOne(id);
    const normalized = await this.validateAndNormalize(data, customer);
    Object.assign(customer, normalized);
    return this.repository.save(customer);
  }

  async remove(id: number) {
    const customer = await this.findOne(id);
    await this.repository.remove(customer);
    return { deleted: true, id };
  }
}
