import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BrokerEntity } from '../brokers/broker.entity';
import { InventoryMovementEntity } from '../inventory/inventory-movement.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductEntity } from '../products/product.entity';
import { SaleItemEntity } from './sale-item.entity';
import { SalePaymentEntity } from './sale-payment.entity';
import { SaleEntity } from './sale.entity';

type CreateSaleItemInput = {
  productId?: number;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
};

type CreateSalePayload = Partial<SaleEntity> & {
  items?: CreateSaleItemInput[];
  receivedAmount?: number;
  paymentReference?: string;
  paymentNotes?: string;
};

type AddPaymentPayload = {
  amount?: number;
  paymentType?: string;
  paymentReference?: string;
  notes?: string;
  paymentDateTime?: string;
};

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SaleEntity)
    private readonly repository: Repository<SaleEntity>,
    @InjectRepository(SaleItemEntity)
    private readonly saleItemsRepository: Repository<SaleItemEntity>,
    @InjectRepository(SalePaymentEntity)
    private readonly salePaymentsRepository: Repository<SalePaymentEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly inventoryRepository: Repository<InventoryMovementEntity>,
    @InjectRepository(BrokerEntity)
    private readonly brokersRepository: Repository<BrokerEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private computeBrokerageAmount(totalAmount: number, brokerageType?: string, brokerageValueInput?: number) {
    const type = brokerageType?.toUpperCase();
    const value = Number(brokerageValueInput ?? 0);

    if (!type) {
      return { brokerageType: undefined, brokerageValue: 0, brokerageAmount: 0 };
    }

    if (!['PERCENT', 'FIXED'].includes(type)) {
      throw new BadRequestException('Brokerage type must be PERCENT or FIXED');
    }

    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Brokerage value cannot be negative');
    }

    if (type === 'PERCENT' && value > 100) {
      throw new BadRequestException('Brokerage percent cannot exceed 100');
    }

    const brokerageAmount =
      type === 'PERCENT'
        ? Number(((totalAmount * value) / 100).toFixed(2))
        : Number(value.toFixed(2));

    return {
      brokerageType: type,
      brokerageValue: Number(value.toFixed(2)),
      brokerageAmount,
    };
  }

  private computePaymentSnapshot(totalAmount: number, paidAmountInput: number) {
    const total = Number(totalAmount || 0);
    const paid = Number(paidAmountInput || 0);

    if (!Number.isFinite(total) || total < 0) {
      throw new BadRequestException('Invalid sale total amount');
    }

    if (!Number.isFinite(paid) || paid < 0) {
      throw new BadRequestException('Invalid paid amount');
    }

    if (paid > total) {
      throw new BadRequestException('Paid amount cannot be greater than invoice total');
    }

    const paidAmount = Number(paid.toFixed(2));
    const balanceAmount = Number((total - paidAmount).toFixed(2));
    const paymentStatus = paidAmount <= 0 ? 'Pending' : balanceAmount <= 0 ? 'Paid' : 'Partial';

    return {
      paidAmount,
      balanceAmount,
      paymentStatus,
    };
  }

  private generateReceiptNumber() {
    const stamp = Date.now().toString().slice(-8);
    return `RCPT-${stamp}`;
  }

  private validateInvoiceNumber(invoiceNumber?: string) {
    const value = (invoiceNumber ?? '').trim();
    const pattern = /^[A-Z0-9][A-Z0-9/-]{2,29}$/i;

    if (!pattern.test(value)) {
      throw new BadRequestException(
        'Invoice number must be 3-30 characters and use only letters, numbers, - or /',
      );
    }

    return value;
  }

  private validatePaymentReference(paymentType: string, paymentReference?: string) {
    const requiresReference = ['UPI', 'Bank Transfer', 'Card'].includes(paymentType);
    if (requiresReference && !(paymentReference ?? '').trim()) {
      throw new BadRequestException(
        'Payment reference is required for UPI, Bank Transfer, and Card payments',
      );
    }
  }

  findAll(companyId?: number) {
    const query = this.repository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.company', 'company')
      .leftJoinAndSelect('sale.product', 'product')
      .leftJoinAndSelect('sale.broker', 'broker')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('sale.payments', 'payments')
      .leftJoinAndSelect('items.product', 'itemProduct');

    if (companyId) {
      query.where('sale.companyId = :companyId', { companyId });
    }

    return query
      .orderBy('sale.saleDateTime', 'DESC')
      .addOrderBy('payments.paymentDateTime', 'DESC')
      .getMany();
  }

  async findOne(id: number) {
    const sale = await this.repository.findOne({
      where: { id },
      relations: ['customer', 'company', 'product', 'broker', 'items', 'items.product', 'payments'],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    return sale;
  }

  async listPayments(id: number) {
    await this.findOne(id);

    return this.salePaymentsRepository.find({
      where: { saleId: id },
      order: { paymentDateTime: 'DESC', id: 'DESC' },
    });
  }

  async create(data: CreateSalePayload) {
    const invoiceNumber = this.validateInvoiceNumber(data.invoiceNumber);
    const lowStockSignals: Array<{ productName: string; sku: string; currentStock: number; threshold: number }> = [];

    const existing = await this.repository.findOne({ where: { invoiceNumber } });
    if (existing) {
      throw new BadRequestException(`Invoice number ${invoiceNumber} already exists`);
    }

    const normalizedItems = data.items?.length
      ? data.items
      : [
          {
            productId: data.productId,
            productName: data.productName,
            quantity: Number(data.quantity ?? 0),
            unitPrice: Number(data.unitPrice ?? 0),
          },
        ];

    if (!normalizedItems.length) {
      throw new BadRequestException('At least one item is required');
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const processedItems: Array<{
        product: ProductEntity;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        previousStock: number;
      }> = [];

      for (const item of normalizedItems) {
        const quantity = Number(item.quantity ?? 0);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new BadRequestException('Each item quantity must be greater than zero');
        }

        if (!item.productId) {
          throw new BadRequestException('Each item must include a product');
        }

        const product = await manager.findOne(ProductEntity, { where: { id: item.productId } });
        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        if (typeof data.companyId === 'number' && product.companyId && product.companyId !== data.companyId) {
          throw new BadRequestException(`Product ${product.name} does not belong to the selected company`);
        }

        const unitPrice = Number(item.unitPrice);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new BadRequestException(`Invalid unit price for ${product.name}`);
        }

        const currentStock = Number(product.stock ?? 0);
        if (quantity > currentStock) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${currentStock}, requested: ${quantity}`,
          );
        }

        processedItems.push({
          product,
          quantity,
          unitPrice,
          lineTotal: Number((quantity * unitPrice).toFixed(2)),
          previousStock: currentStock,
        });
      }

      const totalQuantity = processedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = Number(
        processedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
      );
      const paymentSnapshot = this.computePaymentSnapshot(totalAmount, Number(data.receivedAmount ?? 0));
      const saleTimestamp = data.saleDateTime ? new Date(data.saleDateTime) : new Date();
      if (Number.isNaN(saleTimestamp.getTime())) {
        throw new BadRequestException('Invalid sale date and time');
      }
      const saleDate = saleTimestamp.toISOString().slice(0, 10);
      const firstItem = processedItems[0];
      const paymentType = data.paymentType?.trim() || 'Cash';
      const brokerId = data.brokerId ? Number(data.brokerId) : undefined;

      if (brokerId && (!Number.isInteger(brokerId) || brokerId <= 0)) {
        throw new BadRequestException('Invalid broker');
      }

      let broker: BrokerEntity | null = null;
      if (brokerId) {
        broker = await manager.findOne(BrokerEntity, { where: { id: brokerId } });
        if (!broker) {
          throw new BadRequestException('Selected broker does not exist');
        }
        if (broker.companyId && data.companyId && broker.companyId !== data.companyId) {
          throw new BadRequestException('Selected broker does not belong to selected company');
        }
      }

      const brokerageSnapshot = this.computeBrokerageAmount(
        totalAmount,
        data.brokerageType,
        Number(data.brokerageValue ?? 0),
      );

      this.validatePaymentReference(paymentType, data.paymentReference);

      const sale = manager.create(SaleEntity, {
        ...data,
        invoiceNumber,
        productId: firstItem.product.id,
        productName: firstItem.product.name,
        quantity: totalQuantity,
        unitPrice: firstItem.unitPrice,
        totalAmount,
        paidAmount: paymentSnapshot.paidAmount,
        balanceAmount: paymentSnapshot.balanceAmount,
        paymentStatus: paymentSnapshot.paymentStatus,
        paymentType,
        brokerId: broker?.id,
        brokerageType: brokerageSnapshot.brokerageType,
        brokerageValue: brokerageSnapshot.brokerageValue,
        brokerageAmount: brokerageSnapshot.brokerageAmount,
        saleDateTime: saleTimestamp,
        saleDate,
      });

      const createdSale = await manager.save(SaleEntity, sale);

      for (const item of processedItems) {
        const saleItem = manager.create(SaleItemEntity, {
          saleId: createdSale.id,
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        });
        await manager.save(SaleItemEntity, saleItem);

        item.product.stock = Number(item.product.stock ?? 0) - item.quantity;
        await manager.save(ProductEntity, item.product);

        const threshold = Number(item.product.lowStockThreshold ?? 15);
        if (item.previousStock > threshold && item.product.stock <= threshold) {
          lowStockSignals.push({
            productName: item.product.name,
            sku: item.product.sku,
            currentStock: Number(item.product.stock ?? 0),
            threshold,
          });
        }

        const movement = manager.create(InventoryMovementEntity, {
          productId: item.product.id,
          companyId: createdSale.companyId,
          quantity: item.quantity,
          movementType: 'OUT',
          referenceType: 'SALE',
          referenceId: createdSale.invoiceNumber,
          notes: `Sale bill ${createdSale.invoiceNumber} (${item.product.name})`,
        });
        await manager.save(InventoryMovementEntity, movement);
      }

      if (paymentSnapshot.paidAmount > 0) {
        const receipt = manager.create(SalePaymentEntity, {
          saleId: createdSale.id,
          receiptNumber: this.generateReceiptNumber(),
          paymentType: createdSale.paymentType,
          paymentReference: data.paymentReference?.trim() || undefined,
          amount: paymentSnapshot.paidAmount,
          paymentDateTime: saleTimestamp,
          notes: data.paymentNotes?.trim() || `Initial receipt for ${createdSale.invoiceNumber}`,
        });
        await manager.save(SalePaymentEntity, receipt);
      }

      const saved = await manager.findOne(SaleEntity, {
        where: { id: createdSale.id },
        relations: ['customer', 'company', 'product', 'broker', 'items', 'items.product', 'payments'],
      });

      if (!saved) {
        throw new NotFoundException(`Sale with ID ${createdSale.id} not found`);
      }

      return saved;
    });

    for (const signal of lowStockSignals) {
      void this.notificationsService.notifyLowStock({
        ...signal,
        reference: `Sale ${invoiceNumber}`,
      });
    }

    return saved;
  }

  async addPayment(id: number, payload: AddPaymentPayload) {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(SaleEntity, {
        where: { id },
        relations: ['payments'],
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${id} not found`);
      }

      const amount = Number(payload.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Payment amount must be greater than zero');
      }

      const nextPaid = Number((Number(sale.paidAmount || 0) + amount).toFixed(2));
      const paymentSnapshot = this.computePaymentSnapshot(Number(sale.totalAmount || 0), nextPaid);

      const paymentDateTime = payload.paymentDateTime ? new Date(payload.paymentDateTime) : new Date();
      if (Number.isNaN(paymentDateTime.getTime())) {
        throw new BadRequestException('Invalid payment date');
      }

      const paymentType = payload.paymentType?.trim() || sale.paymentType || 'Cash';
      this.validatePaymentReference(paymentType, payload.paymentReference);

      const payment = manager.create(SalePaymentEntity, {
        saleId: sale.id,
        receiptNumber: this.generateReceiptNumber(),
        paymentType,
        paymentReference: payload.paymentReference?.trim() || undefined,
        amount: Number(amount.toFixed(2)),
        paymentDateTime,
        notes: payload.notes?.trim() || undefined,
      });
      await manager.save(SalePaymentEntity, payment);

      sale.paidAmount = paymentSnapshot.paidAmount;
      sale.balanceAmount = paymentSnapshot.balanceAmount;
      sale.paymentStatus = paymentSnapshot.paymentStatus;
      sale.paymentType = payment.paymentType;
      await manager.save(SaleEntity, sale);

      const updated = await manager.findOne(SaleEntity, {
        where: { id },
        relations: ['customer', 'company', 'product', 'broker', 'items', 'items.product', 'payments'],
      });

      if (!updated) {
        throw new NotFoundException(`Sale with ID ${id} not found`);
      }

      return updated;
    });
  }

  async update(id: number, data: Partial<SaleEntity>) {
    const sale = await this.findOne(id);
    Object.assign(sale, data);
    return this.repository.save(sale);
  }

  async remove(id: number) {
    const sale = await this.findOne(id);
    await this.repository.remove(sale);
    return { deleted: true, id };
  }
}
