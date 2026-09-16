import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingEntity } from '../billing/billing.entity';
import { CompanyEntity } from '../companies/company.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SupplierEntity } from '../suppliers/supplier.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReviewPurchaseOrderDto } from './dto/review-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrderEntity } from './purchase-order.entity';

const poNumberPattern = /^PO-[A-Z0-9/-]{3,30}$/i;
const allowedStatus = new Set(['Draft', 'PendingApproval', 'Approved', 'Rejected', 'Billed', 'Closed', 'Cancelled']);
const approvalOverrideRoles = new Set(['super-admin', 'admin', 'manager']);

function normalizeRole(role: string | undefined): string {
  return (role ?? '').trim().toLowerCase().replace(/\s+/g, '-');
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrderEntity)
    private readonly repository: Repository<PurchaseOrderEntity>,
    @InjectRepository(BillingEntity)
    private readonly billingsRepository: Repository<BillingEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companiesRepository: Repository<CompanyEntity>,
    @InjectRepository(SupplierEntity)
    private readonly suppliersRepository: Repository<SupplierEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  getApprovalRules() {
    return this.notificationsService.getPurchaseOrderApprovalRules();
  }

  findAll(options: {
    companyId?: number;
    supplierId?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const query = this.repository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.company', 'company')
      .leftJoinAndSelect('po.supplier', 'supplier');

    if (options.companyId) {
      query.andWhere('po.companyId = :companyId', { companyId: options.companyId });
    }

    if (options.supplierId) {
      query.andWhere('po.supplierId = :supplierId', { supplierId: options.supplierId });
    }

    if (options.status) {
      query.andWhere('LOWER(po.status) = :status', { status: options.status.toLowerCase() });
    }

    if (options.search?.trim()) {
      query.andWhere(
        '(LOWER(po.poNumber) LIKE :search OR LOWER(po.itemDescription) LIKE :search OR LOWER(CAST(po.items AS TEXT)) LIKE :search)',
        {
          search: `%${options.search.trim().toLowerCase()}%`,
        },
      );
    }

    const sortMap: Record<string, string> = {
      poDate: 'po.poDate',
      poNumber: 'po.poNumber',
      totalAmount: 'po.totalAmount',
      createdAt: 'po.createdAt',
    };
    const sortColumn = sortMap[options.sortBy ?? ''] ?? 'po.poDate';
    const sortOrder = (options.sortOrder ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return query.orderBy(sortColumn, sortOrder as 'ASC' | 'DESC').addOrderBy('po.id', 'DESC').getMany();
  }

  async findOne(id: number) {
    const po = await this.repository.findOne({
      where: { id },
      relations: ['company', 'supplier'],
    });

    if (!po) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }

    const purchaseRegisterEntries = await this.billingsRepository.find({
      where: {
        purchaseOrderId: id,
        billType: 'PURCHASE',
      },
      order: {
        invoiceDate: 'DESC',
        id: 'DESC',
      },
    });

    const totalBilledAmount = Number(
      purchaseRegisterEntries.reduce((sum, entry) => sum + Number(entry.totalAmount ?? 0), 0).toFixed(2),
    );
    const totalPaidAmount = Number(
      purchaseRegisterEntries.reduce((sum, entry) => sum + Number(entry.paidAmount ?? 0), 0).toFixed(2),
    );
    const totalPendingAmount = Number(
      purchaseRegisterEntries.reduce((sum, entry) => sum + Number(entry.balanceAmount ?? 0), 0).toFixed(2),
    );
    const poTotalAmount = Number(po.totalAmount ?? 0);
    const remainingToBillAmount = Number(Math.max(0, poTotalAmount - totalBilledAmount).toFixed(2));

    return {
      ...po,
      purchaseRegisterEntries,
      purchaseRegisterSummary: {
        entryCount: purchaseRegisterEntries.length,
        poTotalAmount,
        totalBilledAmount,
        remainingToBillAmount,
        totalPaidAmount,
        totalPendingAmount,
      },
    };
  }

  private async validateAndNormalize(
    data: Partial<CreatePurchaseOrderDto>,
    current?: PurchaseOrderEntity,
  ): Promise<Partial<PurchaseOrderEntity>> {
    const poNumber = (data.poNumber ?? current?.poNumber ?? '').trim().toUpperCase();
    const poDate = data.poDate ?? current?.poDate ?? '';
    const expectedDeliveryDate =
      data.expectedDeliveryDate === undefined ? current?.expectedDeliveryDate : data.expectedDeliveryDate;
    const requestNumber =
      data.requestNumber === undefined ? current?.requestNumber : data.requestNumber?.trim() || undefined;
    const companyIdRaw = data.companyId ?? current?.companyId;
    const supplierIdRaw = data.supplierId ?? current?.supplierId;
    const itemDescription = (data.itemDescription ?? current?.itemDescription ?? '').trim();
    const requestedItems = data.items ?? current?.items;
    let quantity = Number(data.quantity ?? current?.quantity ?? 0);
    let unitPrice = Number(data.unitPrice ?? current?.unitPrice ?? 0);
    const transportCharges = Number(data.transportCharges ?? current?.transportCharges ?? 0);
    const otherCharges = Number(data.otherCharges ?? current?.otherCharges ?? 0);
    const status = data.status ?? current?.status ?? (current ? 'Draft' : 'PendingApproval');
    const approvalRequiredRoleRaw = data.approvalRequiredRole ?? current?.approvalRequiredRole;
    const notes = data.notes === undefined ? current?.notes : data.notes?.trim() || undefined;

    if (!poNumberPattern.test(poNumber)) {
      throw new BadRequestException('PO number must be in format PO-XXXX and 6-33 chars');
    }

    if (!poDate || Number.isNaN(new Date(poDate).getTime())) {
      throw new BadRequestException('Valid PO date is required');
    }

    if (expectedDeliveryDate && Number.isNaN(new Date(expectedDeliveryDate).getTime())) {
      throw new BadRequestException('Expected delivery date is invalid');
    }

    if (expectedDeliveryDate && expectedDeliveryDate < poDate) {
      throw new BadRequestException('Expected delivery date cannot be before PO date');
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

    const normalizedItems =
      requestedItems && requestedItems.length > 0
        ? requestedItems.map((item) => {
            const productName = (item.productName ?? '').trim();
            const lineQuantity = Number(item.quantity ?? 0);
            const lineUnitPrice = Number(item.unitPrice ?? 0);

            if (productName.length < 2) {
              throw new BadRequestException('Each product line requires a product name');
            }
            if (!Number.isFinite(lineQuantity) || lineQuantity <= 0) {
              throw new BadRequestException('Each product line quantity must be greater than zero');
            }
            if (!Number.isFinite(lineUnitPrice) || lineUnitPrice < 0) {
              throw new BadRequestException('Each product line unit price cannot be negative');
            }

            const lineTotal = Number((lineQuantity * lineUnitPrice).toFixed(2));
            return {
              productName,
              quantity: Number(lineQuantity.toFixed(2)),
              unitPrice: Number(lineUnitPrice.toFixed(2)),
              lineTotal,
            };
          })
        : [];

    if (normalizedItems.length > 0) {
      quantity = Number(normalizedItems.reduce((sum, item) => sum + item.quantity, 0).toFixed(2));
      const weightedBase = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      unitPrice = quantity > 0 ? Number((weightedBase / quantity).toFixed(2)) : 0;
    } else {
      if (itemDescription.length < 2) {
        throw new BadRequestException('Item description must be at least 2 characters');
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than zero');
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new BadRequestException('Unit price cannot be negative');
      }
    }

    if (!Number.isFinite(transportCharges) || transportCharges < 0) {
      throw new BadRequestException('Transport charges cannot be negative');
    }

    if (!Number.isFinite(otherCharges) || otherCharges < 0) {
      throw new BadRequestException('Other charges cannot be negative');
    }

    if (!allowedStatus.has(status)) {
      throw new BadRequestException('Invalid PO status');
    }

    const existing = await this.repository.findOne({ where: { poNumber } });
    if (existing && existing.id !== current?.id) {
      throw new BadRequestException(`PO number ${poNumber} already exists`);
    }

    const subtotalAmount =
      normalizedItems.length > 0
        ? Number(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2))
        : Number((quantity * unitPrice).toFixed(2));
    const totalAmount = Number((subtotalAmount + transportCharges + otherCharges).toFixed(2));
    const approvalRequiredRole = normalizeRole(
      approvalRequiredRoleRaw || this.notificationsService.resolveApprovalRole(totalAmount),
    );

    if (!approvalRequiredRole) {
      throw new BadRequestException('Approval required role is mandatory');
    }

    const computedItemDescription =
      normalizedItems.length > 0
        ? normalizedItems.map((item) => `${item.productName} (${item.quantity} x ${item.unitPrice})`).join(', ')
        : itemDescription;

    return {
      poNumber,
      poDate,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      requestNumber,
      companyId,
      supplierId,
      itemDescription: computedItemDescription,
      items: normalizedItems,
      quantity: Number(quantity.toFixed(2)),
      unitPrice: Number(unitPrice.toFixed(2)),
      transportCharges: Number(transportCharges.toFixed(2)),
      otherCharges: Number(otherCharges.toFixed(2)),
      subtotalAmount,
      totalAmount,
      status,
      approvalRequiredRole,
      notes,
    };
  }

  async reviewApproval(id: number, data: ReviewPurchaseOrderDto) {
    const po = await this.repository.findOne({ where: { id } });
    if (!po) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }

    if (['Billed', 'Closed', 'Cancelled'].includes(po.status)) {
      throw new BadRequestException('Approval review is not allowed for billed/closed/cancelled PO');
    }

    const actorRole = normalizeRole(data.actingRole);
    if (!actorRole) {
      throw new BadRequestException('Acting role is required');
    }

    const requiredRole = normalizeRole(po.approvalRequiredRole);
    const canReview = actorRole === requiredRole || approvalOverrideRoles.has(actorRole) || actorRole === 'supervisor';
    if (!canReview) {
      throw new BadRequestException(
        `This PO requires ${requiredRole} approval. Role ${actorRole} cannot review this purchase order.`,
      );
    }

    if (data.action === 'approve') {
      po.status = 'Approved';
    } else {
      po.status = 'Rejected';
    }

    po.approvedByRole = actorRole;
    po.approvedAt = new Date();
    po.approvalNotes = data.notes?.trim() || undefined;

    return this.repository.save(po);
  }

  async create(data: CreatePurchaseOrderDto) {
    const normalized = await this.validateAndNormalize(data);
    const created = await this.repository.save(this.repository.create(normalized));

    void this.notificationsService.notifyNewPurchaseOrder({
      poNumber: created.poNumber,
      companyId: created.companyId,
      supplierId: created.supplierId,
      totalAmount: Number(created.totalAmount ?? 0),
      approvalRequiredRole: created.approvalRequiredRole,
      status: created.status,
    });

    return created;
  }

  async update(id: number, data: UpdatePurchaseOrderDto) {
    const current = await this.findOne(id);
    const normalized = await this.validateAndNormalize(data, current);
    Object.assign(current, normalized);
    return this.repository.save(current);
  }

  async remove(id: number) {
    const po = await this.findOne(id);
    await this.repository.remove(po);
    return { deleted: true, id };
  }
}
