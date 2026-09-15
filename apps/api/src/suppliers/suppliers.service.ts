import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyEntity } from '../companies/company.entity';
import { PurchaseOrderEntity } from '../purchase-orders/purchase-order.entity';
import { PurchaseEntity } from '../purchases/purchase.entity';
import { SupplierEntity } from './supplier.entity';

const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;
const phonePattern = /^(\+91[\s-]?)?[6-9]\d{9}$/;

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly repository: Repository<SupplierEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companiesRepository: Repository<CompanyEntity>,
    @InjectRepository(PurchaseEntity)
    private readonly purchasesRepository: Repository<PurchaseEntity>,
    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseOrdersRepository: Repository<PurchaseOrderEntity>,
  ) {}

  findAll(companyId?: number) {
    const query = this.repository
      .createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.company', 'company');

    if (companyId) {
      query.where('supplier.companyId = :companyId', { companyId });
    }

    return query.orderBy('supplier.createdAt', 'DESC').getMany();
  }

  async findOne(id: number) {
    const supplier = await this.repository.findOne({ where: { id }, relations: ['company'] });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async getVendorPriceInsights(product?: string, companyId?: number) {
    const productNeedle = (product ?? '').trim().toLowerCase();

    const purchasesQuery = this.purchasesRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.supplier', 'supplier')
      .select('purchase.supplierId', 'supplierId')
      .addSelect('supplier.name', 'supplierName')
      .addSelect('purchase.productName', 'productName')
      .addSelect('AVG(purchase.unitPrice)', 'avgUnitPrice')
      .addSelect('MIN(purchase.unitPrice)', 'minUnitPrice')
      .addSelect('MAX(purchase.unitPrice)', 'maxUnitPrice')
      .addSelect('COUNT(1)', 'purchaseCount')
      .groupBy('purchase.supplierId')
      .addGroupBy('supplier.name')
      .addGroupBy('purchase.productName');

    if (companyId) {
      purchasesQuery.where('purchase.companyId = :companyId', { companyId });
    }

    if (productNeedle) {
      purchasesQuery.andWhere('LOWER(purchase.productName) LIKE :search', { search: `%${productNeedle}%` });
    }

    const purchaseRows = await purchasesQuery.getRawMany<{
      supplierId: string;
      supplierName: string;
      productName: string;
      avgUnitPrice: string;
      minUnitPrice: string;
      maxUnitPrice: string;
      purchaseCount: string;
    }>();

    const poRows = await this.purchaseOrdersRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .select('po.id', 'id')
      .addSelect('po.companyId', 'companyId')
      .addSelect('po.supplierId', 'supplierId')
      .addSelect('supplier.name', 'supplierName')
      .addSelect('po.items', 'items')
      .where(companyId ? 'po.companyId = :companyId' : '1=1', { companyId })
      .getRawMany<{
        id: string;
        companyId: string;
        supplierId: string;
        supplierName: string;
        items: Array<{ productName: string; unitPrice: number }> | null;
      }>();

    const poInsights: Array<{
      supplierId: number;
      supplierName: string;
      productName: string;
      avgUnitPrice: number;
      minUnitPrice: number;
      maxUnitPrice: number;
      purchaseCount: number;
      source: string;
    }> = [];

    for (const row of poRows) {
      const items = Array.isArray(row.items) ? row.items : [];
      for (const item of items) {
        const itemName = (item.productName ?? '').trim();
        const itemUnitPrice = Number(item.unitPrice ?? 0);
        if (!itemName || !Number.isFinite(itemUnitPrice) || itemUnitPrice < 0) {
          continue;
        }
        if (productNeedle && !itemName.toLowerCase().includes(productNeedle)) {
          continue;
        }

        poInsights.push({
          supplierId: Number(row.supplierId),
          supplierName: row.supplierName ?? '-',
          productName: itemName,
          avgUnitPrice: itemUnitPrice,
          minUnitPrice: itemUnitPrice,
          maxUnitPrice: itemUnitPrice,
          purchaseCount: 1,
          source: 'PO',
        });
      }
    }

    const merged = new Map<string, {
      supplierId: number;
      supplierName: string;
      productName: string;
      avgAccumulator: number;
      countAccumulator: number;
      minUnitPrice: number;
      maxUnitPrice: number;
      purchaseCount: number;
      sources: Set<string>;
    }>();

    for (const row of purchaseRows) {
      const key = `${row.supplierId}|${(row.productName ?? '').toLowerCase()}`;
      const avg = Number(row.avgUnitPrice ?? 0);
      const min = Number(row.minUnitPrice ?? avg);
      const max = Number(row.maxUnitPrice ?? avg);
      const count = Number(row.purchaseCount ?? 0);
      merged.set(key, {
        supplierId: Number(row.supplierId),
        supplierName: row.supplierName ?? '-',
        productName: row.productName ?? '-',
        avgAccumulator: avg * count,
        countAccumulator: count,
        minUnitPrice: min,
        maxUnitPrice: max,
        purchaseCount: count,
        sources: new Set(['PURCHASE']),
      });
    }

    for (const row of poInsights) {
      const key = `${row.supplierId}|${row.productName.toLowerCase()}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          productName: row.productName,
          avgAccumulator: row.avgUnitPrice * row.purchaseCount,
          countAccumulator: row.purchaseCount,
          minUnitPrice: row.minUnitPrice,
          maxUnitPrice: row.maxUnitPrice,
          purchaseCount: row.purchaseCount,
          sources: new Set([row.source]),
        });
      } else {
        existing.avgAccumulator += row.avgUnitPrice * row.purchaseCount;
        existing.countAccumulator += row.purchaseCount;
        existing.purchaseCount += row.purchaseCount;
        existing.minUnitPrice = Math.min(existing.minUnitPrice, row.minUnitPrice);
        existing.maxUnitPrice = Math.max(existing.maxUnitPrice, row.maxUnitPrice);
        existing.sources.add(row.source);
      }
    }

    return Array.from(merged.values())
      .map((item) => ({
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        productName: item.productName,
        avgUnitPrice: Number((item.avgAccumulator / Math.max(1, item.countAccumulator)).toFixed(2)),
        minUnitPrice: Number(item.minUnitPrice.toFixed(2)),
        maxUnitPrice: Number(item.maxUnitPrice.toFixed(2)),
        sampleCount: item.purchaseCount,
        dataSource: Array.from(item.sources),
      }))
      .sort((a, b) => a.avgUnitPrice - b.avgUnitPrice);
  }

  private async validateAndNormalize(
    data: Partial<SupplierEntity>,
    current?: SupplierEntity,
  ): Promise<Partial<SupplierEntity>> {
    const name = (data.name ?? current?.name ?? '').trim();
    const contactPerson =
      data.contactPerson === undefined
        ? current?.contactPerson
        : data.contactPerson?.trim() || undefined;
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
      throw new BadRequestException('Supplier name must be at least 2 characters');
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
      contactPerson,
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

  async create(data: Partial<SupplierEntity>) {
    const normalized = await this.validateAndNormalize(data);
    const supplier = this.repository.create(normalized);
    return this.repository.save(supplier);
  }

  async update(id: number, data: Partial<SupplierEntity>) {
    const supplier = await this.findOne(id);
    const normalized = await this.validateAndNormalize(data, supplier);
    Object.assign(supplier, normalized);
    return this.repository.save(supplier);
  }

  async remove(id: number) {
    const supplier = await this.findOne(id);
    await this.repository.remove(supplier);
    return { deleted: true, id };
  }
}
