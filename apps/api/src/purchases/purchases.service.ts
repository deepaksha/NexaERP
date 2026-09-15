import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyEntity } from '../companies/company.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';
import { PurchaseEntity } from './purchase.entity';

const invoiceNumberPattern = /^[A-Z0-9][A-Z0-9/-]{2,29}$/i;
const allowedPaymentStatus = new Set(['Pending', 'Partial', 'Paid']);

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(PurchaseEntity)
    private readonly repository: Repository<PurchaseEntity>,
    @InjectRepository(SupplierEntity)
    private readonly suppliersRepository: Repository<SupplierEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companiesRepository: Repository<CompanyEntity>,
  ) {}

  findAll(options: {
    companyId?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const query = this.repository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.company', 'company')
      .leftJoinAndSelect('purchase.supplier', 'supplier');

    if (options.companyId) {
      query.where('purchase.companyId = :companyId', { companyId: options.companyId });
    }

    if (options.search?.trim()) {
      query.andWhere(
        '(LOWER(purchase.invoiceNumber) LIKE :search OR LOWER(purchase.productName) LIKE :search OR LOWER(supplier.name) LIKE :search)',
        { search: `%${options.search.trim().toLowerCase()}%` },
      );
    }

    const sortMap: Record<string, string> = {
      purchaseDate: 'purchase.purchaseDate',
      invoiceNumber: 'purchase.invoiceNumber',
      totalAmount: 'purchase.totalAmount',
      createdAt: 'purchase.createdAt',
    };
    const sortColumn = sortMap[options.sortBy ?? ''] ?? 'purchase.purchaseDate';
    const sortOrder = (options.sortOrder ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return query.orderBy(sortColumn, sortOrder as 'ASC' | 'DESC').addOrderBy('purchase.id', 'DESC').getMany();
  }

  async findOne(id: number) {
    const purchase = await this.repository.findOne({
      where: { id },
      relations: ['supplier', 'company'],
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }

    return purchase;
  }

  private async validateAndNormalize(
    data: Partial<PurchaseEntity>,
    current?: PurchaseEntity,
  ): Promise<Partial<PurchaseEntity>> {
    const invoiceNumber = (data.invoiceNumber ?? current?.invoiceNumber ?? '').trim();
    const purchaseDate = data.purchaseDate ?? current?.purchaseDate ?? '';
    const companyIdRaw = data.companyId ?? current?.companyId;
    const supplierIdRaw = data.supplierId ?? current?.supplierId;
    const productName = (data.productName ?? current?.productName ?? '').trim();
    const quantity = Number(data.quantity ?? current?.quantity ?? 0);
    const unitPrice = Number(data.unitPrice ?? current?.unitPrice ?? 0);
    const paymentStatus = data.paymentStatus ?? current?.paymentStatus ?? 'Paid';

    if (!invoiceNumberPattern.test(invoiceNumber)) {
      throw new BadRequestException(
        'Invoice number must be 3-30 characters and use only letters, numbers, - or /',
      );
    }

    if (!purchaseDate || Number.isNaN(new Date(purchaseDate).getTime())) {
      throw new BadRequestException('Valid purchase date is required');
    }

    if (companyIdRaw === undefined || companyIdRaw === null) {
      throw new BadRequestException('Company is required');
    }

    if (supplierIdRaw === undefined || supplierIdRaw === null) {
      throw new BadRequestException('Supplier is required');
    }

    const companyId = Number(companyIdRaw);
    const supplierId = Number(supplierIdRaw);

    if (!Number.isInteger(companyId) || companyId <= 0) {
      throw new BadRequestException('Company is required');
    }

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      throw new BadRequestException('Supplier is required');
    }

    const company = await this.companiesRepository.findOne({ where: { id: companyId } });
    if (!company) {
      throw new BadRequestException('Selected company does not exist');
    }

    const supplier = await this.suppliersRepository.findOne({ where: { id: supplierId } });
    if (!supplier) {
      throw new BadRequestException('Selected supplier does not exist');
    }

    if (supplier.companyId && supplier.companyId !== companyId) {
      throw new BadRequestException('Selected supplier does not belong to selected company');
    }

    if (productName.length < 2) {
      throw new BadRequestException('Product name must be at least 2 characters');
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new BadRequestException('Unit price cannot be negative');
    }

    if (!allowedPaymentStatus.has(paymentStatus)) {
      throw new BadRequestException('Invalid payment status');
    }

    return {
      invoiceNumber,
      purchaseDate,
      companyId,
      supplierId,
      productName,
      quantity: Number(quantity.toFixed(2)),
      unitPrice: Number(unitPrice.toFixed(2)),
      totalAmount: Number((quantity * unitPrice).toFixed(2)),
      paymentStatus,
    };
  }

  async create(data: Partial<PurchaseEntity>) {
    const normalized = await this.validateAndNormalize(data);
    const purchase = this.repository.create(normalized);
    return this.repository.save(purchase);
  }

  async update(id: number, data: Partial<PurchaseEntity>) {
    const purchase = await this.findOne(id);
    const normalized = await this.validateAndNormalize(data, purchase);
    Object.assign(purchase, normalized);
    return this.repository.save(purchase);
  }

  async remove(id: number) {
    const purchase = await this.findOne(id);
    await this.repository.remove(purchase);
    return { deleted: true, id };
  }
}
