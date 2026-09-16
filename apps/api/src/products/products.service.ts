import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  async findAll(search?: string, companyId?: number) {
    const query = this.productRepository.createQueryBuilder('product');

    if (search) {
      query.andWhere(
        '(LOWER(product.name) LIKE :search OR LOWER(product.sku) LIKE :search OR LOWER(product.category) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (companyId) {
      query.andWhere('product.companyId = :companyId', { companyId });
    }

    return query.orderBy('product.createdAt', 'DESC').getMany();
  }

  async findOne(id: number) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async create(data: Partial<ProductEntity>) {
    const product = this.productRepository.create(data);
    return this.productRepository.save(product);
  }

  async update(id: number, data: Partial<ProductEntity>) {
    const product = await this.findOne(id);
    Object.assign(product, data);
    return this.productRepository.save(product);
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    return { deleted: true, id };
  }
}
