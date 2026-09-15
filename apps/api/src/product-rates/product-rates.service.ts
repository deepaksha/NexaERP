import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductEntity } from '../products/product.entity';
import { CreateProductRateDto } from './dto/create-product-rate.dto';
import { UpdateProductRateDto } from './dto/update-product-rate.dto';
import { ProductRateEntity } from './product-rate.entity';

@Injectable()
export class ProductRatesService {
  constructor(
    @InjectRepository(ProductRateEntity)
    private readonly ratesRepository: Repository<ProductRateEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
  ) {}

  private normalizeDate(value?: string) {
    if (!value) {
      const now = new Date();
      return now.toISOString().slice(0, 10);
    }

    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException('rateDate must be in YYYY-MM-DD format');
    }
    return trimmed;
  }

  async findAll(filters: {
    productId?: number;
    fromDate?: string;
    toDate?: string;
    companyId?: number;
    limit?: number;
  }) {
    const query = this.ratesRepository
      .createQueryBuilder('rate')
      .leftJoinAndSelect('rate.product', 'product');

    if (filters.productId) {
      query.andWhere('rate.productId = :productId', { productId: filters.productId });
    }

    if (filters.companyId) {
      query.andWhere('product.companyId = :companyId', { companyId: filters.companyId });
    }

    if (filters.fromDate) {
      query.andWhere('rate.rateDate >= :fromDate', { fromDate: this.normalizeDate(filters.fromDate) });
    }

    if (filters.toDate) {
      query.andWhere('rate.rateDate <= :toDate', { toDate: this.normalizeDate(filters.toDate) });
    }

    if (filters.limit && filters.limit > 0) {
      query.take(filters.limit);
    }

    return query.orderBy('rate.rateDate', 'DESC').addOrderBy('rate.id', 'DESC').getMany();
  }

  async findToday(productIds?: number[]) {
    const today = this.normalizeDate();
    const query = this.ratesRepository
      .createQueryBuilder('rate')
      .leftJoinAndSelect('rate.product', 'product')
      .where('rate.rateDate = :today', { today });

    if (productIds?.length) {
      query.andWhere('rate.productId IN (:...productIds)', { productIds });
    }

    return query.orderBy('product.name', 'ASC').getMany();
  }

  async getLastDaysForProduct(productId: number, days = 5) {
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new BadRequestException('Valid productId is required');
    }

    const product = await this.productsRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const safeDays = Math.max(1, Math.min(Number(days) || 5, 31));
    const today = this.normalizeDate();

    const rows = await this.ratesRepository
      .createQueryBuilder('rate')
      .leftJoinAndSelect('rate.product', 'product')
      .where('rate.productId = :productId', { productId })
      .andWhere('rate.rateDate <= :today', { today })
      .orderBy('rate.rateDate', 'DESC')
      .addOrderBy('rate.id', 'DESC')
      .take(safeDays)
      .getMany();

    return {
      product,
      days: safeDays,
      today,
      rates: rows,
    };
  }

  async upsert(data: CreateProductRateDto) {
    const product = await this.productsRepository.findOne({ where: { id: data.productId } });
    if (!product) {
      throw new BadRequestException('Selected product does not exist');
    }

    const rateDate = this.normalizeDate(data.rateDate);
    const value = Number(data.rate ?? 0);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Rate cannot be negative');
    }

    const existing = await this.ratesRepository.findOne({ where: { productId: data.productId, rateDate } });

    if (existing) {
      existing.rate = Number(value.toFixed(2));
      existing.source = (data.source ?? existing.source ?? 'Government').trim() || 'Government';
      existing.notes = data.notes?.trim() || undefined;
      return this.ratesRepository.save(existing);
    }

    const created = this.ratesRepository.create({
      productId: data.productId,
      rateDate,
      rate: Number(value.toFixed(2)),
      source: (data.source ?? 'Government').trim() || 'Government',
      notes: data.notes?.trim() || undefined,
    });

    return this.ratesRepository.save(created);
  }

  async update(id: number, data: UpdateProductRateDto) {
    const row = await this.ratesRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Product rate with ID ${id} not found`);
    }

    if (data.productId !== undefined && data.productId !== row.productId) {
      const product = await this.productsRepository.findOne({ where: { id: data.productId } });
      if (!product) {
        throw new BadRequestException('Selected product does not exist');
      }
      row.productId = data.productId;
    }

    if (data.rateDate !== undefined) {
      row.rateDate = this.normalizeDate(data.rateDate);
    }

    if (data.rate !== undefined) {
      const value = Number(data.rate);
      if (!Number.isFinite(value) || value < 0) {
        throw new BadRequestException('Rate cannot be negative');
      }
      row.rate = Number(value.toFixed(2));
    }

    if (data.source !== undefined) {
      row.source = data.source.trim() || 'Government';
    }

    if (data.notes !== undefined) {
      row.notes = data.notes?.trim() || undefined;
    }

    return this.ratesRepository.save(row);
  }

  async remove(id: number) {
    const row = await this.ratesRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Product rate with ID ${id} not found`);
    }

    await this.ratesRepository.remove(row);
    return { deleted: true, id };
  }

  async getLatestRateMap(productIds: number[], rateDate?: string) {
    const validIds = [...new Set(productIds.filter((value) => Number.isInteger(value) && value > 0))];
    if (!validIds.length) {
      return {};
    }

    const referenceDate = this.normalizeDate(rateDate);
    const records = await this.ratesRepository.find({
      where: {
        productId: In(validIds),
      },
      relations: ['product'],
      order: { rateDate: 'DESC', id: 'DESC' },
    });

    const output: Record<number, { rate: number; rateDate: string; source: string }> = {};

    for (const record of records) {
      if (record.rateDate > referenceDate) {
        continue;
      }
      if (!output[record.productId]) {
        output[record.productId] = {
          rate: Number(record.rate),
          rateDate: record.rateDate,
          source: record.source,
        };
      }
    }

    return output;
  }
}
