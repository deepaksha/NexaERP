import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyEntity } from '../companies/company.entity';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { UpdateBrokerDto } from './dto/update-broker.dto';
import { BrokerEntity } from './broker.entity';

@Injectable()
export class BrokersService {
  constructor(
    @InjectRepository(BrokerEntity)
    private readonly repository: Repository<BrokerEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companiesRepository: Repository<CompanyEntity>,
  ) {}

  findAll(companyId?: number) {
    const query = this.repository.createQueryBuilder('broker').leftJoinAndSelect('broker.company', 'company');
    if (companyId) {
      query.where('broker.companyId = :companyId', { companyId });
    }
    return query.orderBy('broker.createdAt', 'DESC').getMany();
  }

  async findOne(id: number) {
    const broker = await this.repository.findOne({ where: { id }, relations: ['company'] });
    if (!broker) throw new NotFoundException(`Broker with ID ${id} not found`);
    return broker;
  }

  private async validateAndNormalize(data: Partial<BrokerEntity>, current?: BrokerEntity) {
    const name = (data.name ?? current?.name ?? '').trim();
    const contactPerson = data.contactPerson === undefined ? current?.contactPerson : data.contactPerson?.trim() || undefined;
    const phone = data.phone === undefined ? current?.phone : data.phone?.trim() || undefined;
    const email = data.email === undefined ? current?.email : data.email?.trim().toLowerCase() || undefined;
    const companyIdRaw = data.companyId ?? current?.companyId;
    const notes = data.notes === undefined ? current?.notes : data.notes?.trim() || undefined;
    const status = data.status ?? current?.status ?? 'Active';

    if (name.length < 2) throw new BadRequestException('Broker name must be at least 2 characters');

    let companyId: number | undefined;
    if (companyIdRaw !== undefined && companyIdRaw !== null && `${companyIdRaw}` !== '') {
      companyId = Number(companyIdRaw);
      if (!Number.isInteger(companyId) || companyId <= 0) throw new BadRequestException('Invalid company');
      const company = await this.companiesRepository.findOne({ where: { id: companyId } });
      if (!company) throw new BadRequestException('Selected company does not exist');
    }

    if (!['Active', 'Inactive'].includes(status)) throw new BadRequestException('Invalid broker status');

    const existing = await this.repository.findOne({ where: { name } });
    if (existing && existing.id !== current?.id) {
      throw new BadRequestException(`Broker name ${name} already exists`);
    }

    return { name, contactPerson, phone, email, companyId, notes, status };
  }

  async create(data: CreateBrokerDto) {
    const normalized = await this.validateAndNormalize(data);
    return this.repository.save(this.repository.create(normalized));
  }

  async update(id: number, data: UpdateBrokerDto) {
    const current = await this.findOne(id);
    const normalized = await this.validateAndNormalize(data, current);
    Object.assign(current, normalized);
    return this.repository.save(current);
  }

  async remove(id: number) {
    const broker = await this.findOne(id);
    await this.repository.remove(broker);
    return { deleted: true, id };
  }
}
