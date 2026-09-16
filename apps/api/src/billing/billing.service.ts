import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrokerEntity } from '../brokers/broker.entity';
import { CompanyEntity } from '../companies/company.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { JournalEntryEntity } from '../journal-entries/journal-entry.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PurchaseOrderEntity } from '../purchase-orders/purchase-order.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';
import { BillingEntity } from './billing.entity';
import { CreateBillingDto } from './dto/create-billing.dto';

const invoiceNumberPattern = /^[A-Z0-9][A-Z0-9/-]{2,29}$/i;
const allowedInvoiceStatus = new Set(['Draft', 'Issued', 'Paid', 'Overdue']);
const allowedBillType = new Set(['SALE', 'PURCHASE']);
const allowedBrokerageType = new Set(['PERCENT', 'FIXED']);
const postedStatuses = new Set(['Issued', 'Paid', 'Overdue']);

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingEntity)
    private readonly repository: Repository<BillingEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companiesRepository: Repository<CompanyEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customersRepository: Repository<CustomerEntity>,
    @InjectRepository(SupplierEntity)
    private readonly suppliersRepository: Repository<SupplierEntity>,
    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseOrdersRepository: Repository<PurchaseOrderEntity>,
    @InjectRepository(BrokerEntity)
    private readonly brokersRepository: Repository<BrokerEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntriesRepository: Repository<JournalEntryEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private triggerBillingPaymentNotification(entry: BillingEntity, previousPaymentStatus?: string) {
    const billType = (entry.billType ?? '').toUpperCase();
    const nextStatus = entry.paymentStatus ?? 'Pending';
    const shouldNotify =
      billType === 'PURCHASE' &&
      (nextStatus === 'Paid' || nextStatus === 'Partial' || previousPaymentStatus !== nextStatus);

    if (!shouldNotify) {
      return;
    }

    void this.notificationsService.notifyBillingPaymentUpdate({
      invoiceNumber: entry.invoiceNumber,
      billType,
      paymentStatus: nextStatus,
      paidAmount: Number(entry.paidAmount ?? 0),
      balanceAmount: Number(entry.balanceAmount ?? 0),
      totalAmount: Number(entry.totalAmount ?? 0),
      purchaseOrderId: entry.purchaseOrderId ?? undefined,
    });
  }

  findAll(options: {
    companyId?: number;
    billType?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const query = this.repository
      .createQueryBuilder('billing')
      .leftJoinAndSelect('billing.company', 'company')
      .leftJoinAndSelect('billing.customer', 'customer')
      .leftJoinAndSelect('billing.supplier', 'supplier')
      .leftJoinAndSelect('billing.purchaseOrder', 'purchaseOrder')
      .leftJoinAndSelect('billing.broker', 'broker');

    if (options.companyId) {
      query.andWhere('billing.companyId = :companyId', { companyId: options.companyId });
    }

    if (options.billType && options.billType !== 'all') {
      query.andWhere('LOWER(billing.billType) = :billType', {
        billType: options.billType.toLowerCase(),
      });
    }

    if (options.search?.trim()) {
      query.andWhere(
        '(LOWER(billing.invoiceNumber) LIKE :search OR LOWER(customer.name) LIKE :search OR LOWER(supplier.name) LIKE :search)',
        { search: `%${options.search.trim().toLowerCase()}%` },
      );
    }

    const sortMap: Record<string, string> = {
      invoiceDate: 'billing.invoiceDate',
      invoiceNumber: 'billing.invoiceNumber',
      totalAmount: 'billing.totalAmount',
      createdAt: 'billing.createdAt',
      billType: 'billing.billType',
    };

    const sortColumn = sortMap[options.sortBy ?? ''] ?? 'billing.invoiceDate';
    const sortOrder = (options.sortOrder ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return query
      .orderBy(sortColumn, sortOrder as 'ASC' | 'DESC')
      .addOrderBy('billing.id', 'DESC')
      .getMany();
  }

  async findOne(id: number) {
    const billing = await this.repository.findOne({
      where: { id },
      relations: ['company', 'customer', 'supplier', 'purchaseOrder', 'broker'],
    });

    if (!billing) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return billing;
  }

  private computePaymentSnapshot(totalAmount: number, paidAmountInput: number) {
    const total = Number(totalAmount || 0);
    const paid = Number(paidAmountInput || 0);

    if (!Number.isFinite(paid) || paid < 0) {
      throw new BadRequestException('Paid amount cannot be negative');
    }

    if (paid > total) {
      throw new BadRequestException('Paid amount cannot be greater than total amount');
    }

    const paidAmount = Number(paid.toFixed(2));
    const balanceAmount = Number((total - paidAmount).toFixed(2));
    const paymentStatus = paidAmount <= 0 ? 'Pending' : balanceAmount <= 0 ? 'Paid' : 'Partial';

    return { paidAmount, balanceAmount, paymentStatus };
  }

  private computeBrokerageAmount(totalAmount: number, brokerageType?: string, brokerageValueInput?: number) {
    const brokerageValue = Number(brokerageValueInput ?? 0);
    if (!Number.isFinite(brokerageValue) || brokerageValue < 0) {
      throw new BadRequestException('Brokerage value cannot be negative');
    }

    if (!brokerageType) {
      return {
        brokerageType: undefined,
        brokerageValue: 0,
        brokerageAmount: 0,
      };
    }

    const normalizedType = brokerageType.toUpperCase();
    if (!allowedBrokerageType.has(normalizedType)) {
      throw new BadRequestException('Brokerage type must be PERCENT or FIXED');
    }

    let brokerageAmount = 0;
    if (normalizedType === 'PERCENT') {
      if (brokerageValue > 100) {
        throw new BadRequestException('Brokerage percent cannot exceed 100');
      }
      brokerageAmount = Number(((totalAmount * brokerageValue) / 100).toFixed(2));
    } else {
      brokerageAmount = Number(brokerageValue.toFixed(2));
    }

    return {
      brokerageType: normalizedType,
      brokerageValue: Number(brokerageValue.toFixed(2)),
      brokerageAmount,
    };
  }

  private async upsertJournalEntry(normalized: Partial<BillingEntity>, billingId: number) {
    await this.journalEntriesRepository.delete({ billingId });

    if (normalized.billType !== 'PURCHASE' || !normalized.purchaseOrderId) {
      return;
    }

    const entry = this.journalEntriesRepository.create({
      billingId,
      purchaseOrderId: normalized.purchaseOrderId,
      companyId: normalized.companyId,
      entryDate: normalized.invoiceDate,
      debitAmount: Number(normalized.totalAmount ?? 0),
      creditAmount: Number(normalized.paidAmount ?? 0),
      narration:
        normalized.journalNarration ||
        `Purchase bill ${normalized.invoiceNumber} against PO ${normalized.purchaseOrderId}`,
    });

    await this.journalEntriesRepository.save(entry);
  }

  private async validateAndNormalize(
    data: Partial<BillingEntity>,
    current?: BillingEntity,
  ): Promise<Partial<BillingEntity>> {
    const invoiceNumber = (data.invoiceNumber ?? current?.invoiceNumber ?? '').trim().toUpperCase();
    const invoiceDate = data.invoiceDate ?? current?.invoiceDate ?? '';
    const dueDate = data.dueDate === undefined ? current?.dueDate : data.dueDate;
    const billType = (data.billType ?? current?.billType ?? 'SALE').toUpperCase();
    const companyIdRaw = data.companyId ?? current?.companyId;
    const customerIdRaw = data.customerId ?? current?.customerId;
    const supplierIdRaw = data.supplierId ?? current?.supplierId;
    const purchaseOrderIdRaw = data.purchaseOrderId ?? current?.purchaseOrderId;
    const totalAmount = Number(data.totalAmount ?? current?.totalAmount ?? 0);
    const gstAmount = Number(data.gstAmount ?? current?.gstAmount ?? 0);
    const transportCharges = Number(data.transportCharges ?? current?.transportCharges ?? 0);
    const otherCharges = Number(data.otherCharges ?? current?.otherCharges ?? 0);
    const paidAmountRaw = Number(data.paidAmount ?? current?.paidAmount ?? 0);
    const status = data.status ?? current?.status ?? 'Draft';
    const brokerIdRaw = data.brokerId ?? current?.brokerId;
    const brokerageTypeRaw = data.brokerageType ?? current?.brokerageType;
    const brokerageValueRaw = Number(data.brokerageValue ?? current?.brokerageValue ?? 0);
    const originalBillAttachmentUrl =
      data.originalBillAttachmentUrl === undefined
        ? current?.originalBillAttachmentUrl
        : data.originalBillAttachmentUrl?.trim() || undefined;
    const originalBillAmount = Number(data.originalBillAmount ?? current?.originalBillAmount ?? 0);
    const journalNarration =
      data.journalNarration === undefined ? current?.journalNarration : data.journalNarration?.trim() || undefined;
    const notes = data.notes === undefined ? current?.notes : data.notes?.trim() || undefined;

    if (!invoiceNumberPattern.test(invoiceNumber)) {
      throw new BadRequestException(
        'Invoice number must be 3-30 characters and use only letters, numbers, - or /',
      );
    }

    if (!invoiceDate || Number.isNaN(new Date(invoiceDate).getTime())) {
      throw new BadRequestException('Valid invoice date is required');
    }

    if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
      throw new BadRequestException('Due date is invalid');
    }

    if (dueDate && dueDate < invoiceDate) {
      throw new BadRequestException('Due date cannot be earlier than invoice date');
    }

    if (!allowedBillType.has(billType)) {
      throw new BadRequestException('billType must be SALE or PURCHASE');
    }

    const companyId = Number(companyIdRaw);
    if (!Number.isInteger(companyId) || companyId <= 0) {
      throw new BadRequestException('Company is required');
    }

    const company = await this.companiesRepository.findOne({ where: { id: companyId } });
    if (!company) {
      throw new BadRequestException('Selected company does not exist');
    }

    let customerId: number | undefined;
    let supplierId: number | undefined;

    if (billType === 'SALE') {
      customerId = Number(customerIdRaw);
      if (!Number.isInteger(customerId) || customerId <= 0) {
        throw new BadRequestException('Customer is required for sales billing');
      }

      const customer = await this.customersRepository.findOne({ where: { id: customerId } });
      if (!customer) {
        throw new BadRequestException('Selected customer does not exist');
      }

      if (customer.companyId && customer.companyId !== companyId) {
        throw new BadRequestException('Selected customer does not belong to selected company');
      }
    }

    if (billType === 'PURCHASE') {
      supplierId = Number(supplierIdRaw);
      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        throw new BadRequestException('Supplier is required for purchase billing');
      }

      const supplier = await this.suppliersRepository.findOne({ where: { id: supplierId } });
      if (!supplier) {
        throw new BadRequestException('Selected supplier does not exist');
      }

      if (supplier.companyId && supplier.companyId !== companyId) {
        throw new BadRequestException('Selected supplier does not belong to selected company');
      }
    }

    let purchaseOrderId: number | undefined;
    if (purchaseOrderIdRaw !== undefined && purchaseOrderIdRaw !== null && `${purchaseOrderIdRaw}` !== '') {
      purchaseOrderId = Number(purchaseOrderIdRaw);
      if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) {
        throw new BadRequestException('Invalid purchase order reference');
      }

      const po = await this.purchaseOrdersRepository.findOne({ where: { id: purchaseOrderId } });
      if (!po) {
        throw new BadRequestException('Selected purchase order does not exist');
      }

      if (po.companyId !== companyId) {
        throw new BadRequestException('Purchase order does not belong to selected company');
      }

      if (billType !== 'PURCHASE') {
        throw new BadRequestException('Purchase order can only be linked with purchase billing');
      }

      if (supplierId && po.supplierId !== supplierId) {
        throw new BadRequestException('Purchase order supplier does not match selected supplier');
      }
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new BadRequestException('Total amount must be greater than zero');
    }

    if (!Number.isFinite(gstAmount) || gstAmount < 0) {
      throw new BadRequestException('GST amount cannot be negative');
    }

    if (gstAmount > totalAmount) {
      throw new BadRequestException('GST amount cannot exceed total amount');
    }

    if (!Number.isFinite(transportCharges) || transportCharges < 0) {
      throw new BadRequestException('Transport charges cannot be negative');
    }

    if (!Number.isFinite(otherCharges) || otherCharges < 0) {
      throw new BadRequestException('Other charges cannot be negative');
    }

    if (!allowedInvoiceStatus.has(status)) {
      throw new BadRequestException('Invalid invoice status');
    }

    let brokerId: number | undefined;
    if (brokerIdRaw !== undefined && brokerIdRaw !== null && `${brokerIdRaw}` !== '') {
      brokerId = Number(brokerIdRaw);
      if (!Number.isInteger(brokerId) || brokerId <= 0) {
        throw new BadRequestException('Invalid broker reference');
      }
      const broker = await this.brokersRepository.findOne({ where: { id: brokerId } });
      if (!broker) {
        throw new BadRequestException('Selected broker does not exist');
      }
      if (broker.companyId && broker.companyId !== companyId) {
        throw new BadRequestException('Selected broker does not belong to selected company');
      }
    }

    const paymentSnapshot = this.computePaymentSnapshot(totalAmount, paidAmountRaw);
    const brokerageSnapshot = this.computeBrokerageAmount(totalAmount, brokerageTypeRaw, brokerageValueRaw);

    if (!Number.isFinite(originalBillAmount) || originalBillAmount < 0) {
      throw new BadRequestException('Original bill amount cannot be negative');
    }

    if (
      originalBillAttachmentUrl &&
      !/^https?:\/\//i.test(originalBillAttachmentUrl) &&
      !/^\/api\/billing\/attachments\//i.test(originalBillAttachmentUrl)
    ) {
      throw new BadRequestException('Original bill attachment must be a valid URL or uploaded bill path');
    }

    const existing = await this.repository.findOne({ where: { invoiceNumber } });
    if (existing && existing.id !== current?.id) {
      throw new BadRequestException(`Invoice number ${invoiceNumber} already exists`);
    }

    return {
      invoiceNumber,
      invoiceDate,
      dueDate: dueDate || undefined,
      billType,
      companyId,
      customerId,
      supplierId,
      purchaseOrderId,
      totalAmount: Number(totalAmount.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      transportCharges: Number(transportCharges.toFixed(2)),
      otherCharges: Number(otherCharges.toFixed(2)),
      status,
      paymentStatus: paymentSnapshot.paymentStatus,
      paidAmount: paymentSnapshot.paidAmount,
      balanceAmount: paymentSnapshot.balanceAmount,
      brokerId,
      brokerageType: brokerageSnapshot.brokerageType,
      brokerageValue: brokerageSnapshot.brokerageValue,
      brokerageAmount: brokerageSnapshot.brokerageAmount,
      originalBillAttachmentUrl,
      originalBillAmount: Number(originalBillAmount.toFixed(2)),
      journalNarration,
      notes,
    };
  }

  async create(data: CreateBillingDto) {
    const normalized = await this.validateAndNormalize(data);

    if (normalized.billType === 'PURCHASE' && normalized.purchaseOrderId) {
      const po = await this.purchaseOrdersRepository.findOne({ where: { id: normalized.purchaseOrderId } });
      if (!po) {
        throw new BadRequestException('Selected purchase order does not exist');
      }

      const billedRows = await this.repository.find({
        where: {
          purchaseOrderId: normalized.purchaseOrderId,
          billType: 'PURCHASE',
        },
      });

      const existingBilled = billedRows.reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);
      const nextBilled = Number((existingBilled + Number(normalized.totalAmount ?? 0)).toFixed(2));
      const poLimit = Number(po.totalAmount ?? 0);
      if (nextBilled > poLimit) {
        throw new BadRequestException(
          `Purchase Register amount exceeds PO value. Remaining billable amount is ${Number(
            Math.max(0, poLimit - existingBilled).toFixed(2),
          )}`,
        );
      }
    }

    if (normalized.billType === 'PURCHASE' && normalized.purchaseOrderId) {
      await this.purchaseOrdersRepository.update(normalized.purchaseOrderId, { status: 'Billed' });
    }

    const created = await this.repository.save(this.repository.create(normalized));
    await this.upsertJournalEntry(normalized, created.id);
    this.triggerBillingPaymentNotification(created);
    return created;
  }

  async update(id: number, data: Partial<BillingEntity>) {
    const billing = await this.findOne(id);
    const previousPaymentStatus = billing.paymentStatus;

    if (postedStatuses.has(billing.status)) {
      throw new BadRequestException('Posted register entries cannot be modified. Create a correction entry instead.');
    }

    const normalized = await this.validateAndNormalize(data, billing);

    if (normalized.billType === 'PURCHASE' && normalized.purchaseOrderId) {
      const po = await this.purchaseOrdersRepository.findOne({ where: { id: normalized.purchaseOrderId } });
      if (!po) {
        throw new BadRequestException('Selected purchase order does not exist');
      }

      const billedRows = await this.repository.find({
        where: {
          purchaseOrderId: normalized.purchaseOrderId,
          billType: 'PURCHASE',
        },
      });

      const existingBilledExcludingCurrent = billedRows
        .filter((row) => row.id !== id)
        .reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);
      const nextBilled = Number(
        (existingBilledExcludingCurrent + Number(normalized.totalAmount ?? 0)).toFixed(2),
      );
      const poLimit = Number(po.totalAmount ?? 0);
      if (nextBilled > poLimit) {
        throw new BadRequestException(
          `Purchase Register amount exceeds PO value. Remaining billable amount is ${Number(
            Math.max(0, poLimit - existingBilledExcludingCurrent).toFixed(2),
          )}`,
        );
      }
    }

    if (normalized.billType === 'PURCHASE' && normalized.purchaseOrderId) {
      await this.purchaseOrdersRepository.update(normalized.purchaseOrderId, { status: 'Billed' });
    }

    Object.assign(billing, normalized);
    const saved = await this.repository.save(billing);
    await this.upsertJournalEntry(normalized, saved.id);
    this.triggerBillingPaymentNotification(saved, previousPaymentStatus);
    return saved;
  }

  async remove(id: number) {
    const billing = await this.findOne(id);

    if (postedStatuses.has(billing.status)) {
      throw new BadRequestException('Posted register entries cannot be deleted. Create a correction entry instead.');
    }

    await this.repository.remove(billing);
    return { deleted: true, id };
  }
}
