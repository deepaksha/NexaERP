import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingEntity } from '../billing/billing.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { InventoryMovementEntity } from '../inventory/inventory-movement.entity';
import { PurchaseEntity } from '../purchases/purchase.entity';
import { SaleEntity } from '../sales/sale.entity';

type MonthlyRow = {
  month: string;
  sales: number;
  purchases: number;
  billed: number;
};

type TransactionRow = {
  source: 'SALE' | 'PURCHASE' | 'SALES_INVOICE' | 'PURCHASE_BILL';
  date: string;
  reference: string;
  companyId: number | null;
  counterparty: string;
  paymentStatus: string;
  amount: number;
  gstAmount: number;
  notes: string;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(SaleEntity)
    private readonly salesRepository: Repository<SaleEntity>,
    @InjectRepository(PurchaseEntity)
    private readonly purchasesRepository: Repository<PurchaseEntity>,
    @InjectRepository(BillingEntity)
    private readonly billingRepository: Repository<BillingEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customersRepository: Repository<CustomerEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly inventoryRepository: Repository<InventoryMovementEntity>,
  ) {}

  async getSummary(companyId?: number, startDate?: string, endDate?: string) {
    const salesQuery = this.salesRepository
      .createQueryBuilder('sale')
      .select('sale.totalAmount', 'totalAmount')
      .addSelect('sale.saleDate', 'saleDate');

    const purchasesQuery = this.purchasesRepository
      .createQueryBuilder('purchase')
      .select('purchase.totalAmount', 'totalAmount')
      .addSelect('purchase.purchaseDate', 'purchaseDate');

    const billingQuery = this.billingRepository
      .createQueryBuilder('billing')
      .select('billing.totalAmount', 'totalAmount')
      .addSelect('billing.gstAmount', 'gstAmount')
      .addSelect('billing.paymentStatus', 'paymentStatus')
      .addSelect('billing.invoiceDate', 'invoiceDate');

    const movementsQuery = this.inventoryRepository
      .createQueryBuilder('movement')
      .select('movement.quantity', 'quantity')
      .addSelect('movement.movementType', 'movementType')
      .addSelect('movement.createdAt', 'createdAt');

    this.applyCommonFilters(salesQuery, 'sale', 'saleDate', companyId, startDate, endDate);
    this.applyCommonFilters(purchasesQuery, 'purchase', 'purchaseDate', companyId, startDate, endDate);
    this.applyCommonFilters(billingQuery, 'billing', 'invoiceDate', companyId, startDate, endDate);
    this.applyCommonFilters(movementsQuery, 'movement', 'createdAt', companyId, startDate, endDate);

    const whereByCompany = companyId ? { companyId } : {};

    const [salesRows, purchasesRows, billingRows, customers, movementRows] = await Promise.all([
      salesQuery.getRawMany(),
      purchasesQuery.getRawMany(),
      billingQuery.getRawMany(),
      this.customersRepository.find({ select: { id: true }, where: whereByCompany }),
      movementsQuery.getRawMany(),
    ]);

    const sales = salesRows.map((row) => ({
      saleDate: String(row.saleDate ?? ''),
      totalAmount: this.toNumber(row.totalAmount),
    }));

    const purchases = purchasesRows.map((row) => ({
      purchaseDate: String(row.purchaseDate ?? ''),
      totalAmount: this.toNumber(row.totalAmount),
    }));

    const billing = billingRows.map((row) => ({
      invoiceDate: String(row.invoiceDate ?? ''),
      paymentStatus: String(row.paymentStatus ?? ''),
      totalAmount: this.toNumber(row.totalAmount),
      gstAmount: this.toNumber(row.gstAmount),
    }));

    const movements = movementRows.map((row) => ({
      movementType: String(row.movementType ?? ''),
      quantity: this.toNumber(row.quantity),
    }));

    const totalRevenue = sales.reduce((sum, item) => sum + this.toNumber(item.totalAmount), 0);
    const totalPurchases = purchases.reduce((sum, item) => sum + this.toNumber(item.totalAmount), 0);
    const totalBilled = billing.reduce((sum, item) => sum + this.toNumber(item.totalAmount), 0);
    const totalGst = billing.reduce((sum, item) => sum + this.toNumber(item.gstAmount), 0);

    const receivables = billing
      .filter((invoice) => (invoice.paymentStatus ?? '').toLowerCase() !== 'paid')
      .reduce((sum, invoice) => sum + this.toNumber(invoice.totalAmount), 0);

    const inventoryIn = movements
      .filter((movement) => movement.movementType === 'IN')
      .reduce((sum, movement) => sum + this.toNumber(movement.quantity), 0);

    const inventoryOut = movements
      .filter((movement) => movement.movementType === 'OUT')
      .reduce((sum, movement) => sum + this.toNumber(movement.quantity), 0);

    const monthlySnapshot = this.buildMonthlySnapshot(sales, purchases, billing);

    return {
      metrics: {
        totalRevenue,
        totalPurchases,
        totalBilled,
        totalGst,
        receivables,
        netCashFlow: totalRevenue - totalPurchases,
        inventoryIn,
        inventoryOut,
        customerCount: customers.length,
        invoiceCount: billing.length,
      },
      monthlySnapshot,
      generatedAt: new Date().toISOString(),
      scope: {
        companyId: companyId ?? null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
    };
  }

  async getTransactions(companyId?: number, startDate?: string, endDate?: string) {
    const salesQuery = this.salesRepository
      .createQueryBuilder('sale')
      .leftJoin('sale.customer', 'customer')
      .select('sale.invoiceNumber', 'reference')
      .addSelect('sale.saleDate', 'date')
      .addSelect('sale.companyId', 'companyId')
      .addSelect('customer.name', 'counterparty')
      .addSelect('sale.paymentStatus', 'paymentStatus')
      .addSelect('sale.totalAmount', 'amount');

    const purchasesQuery = this.purchasesRepository
      .createQueryBuilder('purchase')
      .leftJoin('purchase.supplier', 'supplier')
      .select('purchase.invoiceNumber', 'reference')
      .addSelect('purchase.purchaseDate', 'date')
      .addSelect('purchase.companyId', 'companyId')
      .addSelect('supplier.name', 'counterparty')
      .addSelect('purchase.paymentStatus', 'paymentStatus')
      .addSelect('purchase.totalAmount', 'amount');

    const billingQuery = this.billingRepository
      .createQueryBuilder('billing')
      .leftJoin('billing.customer', 'customer')
      .leftJoin('billing.supplier', 'supplier')
      .select('billing.invoiceNumber', 'reference')
      .addSelect('billing.invoiceDate', 'date')
      .addSelect('billing.companyId', 'companyId')
      .addSelect('billing.billType', 'billType')
      .addSelect('customer.name', 'counterparty')
      .addSelect('supplier.name', 'supplierCounterparty')
      .addSelect('billing.paymentStatus', 'paymentStatus')
      .addSelect('billing.totalAmount', 'amount')
      .addSelect('billing.gstAmount', 'gstAmount')
      .addSelect('billing.transportCharges', 'transportCharges')
      .addSelect('billing.notes', 'notes');

    this.applyCommonFilters(salesQuery, 'sale', 'saleDate', companyId, startDate, endDate);
    this.applyCommonFilters(purchasesQuery, 'purchase', 'purchaseDate', companyId, startDate, endDate);
    this.applyCommonFilters(billingQuery, 'billing', 'invoiceDate', companyId, startDate, endDate);

    const [salesRows, purchaseRows, billingRows] = await Promise.all([
      salesQuery.getRawMany(),
      purchasesQuery.getRawMany(),
      billingQuery.getRawMany(),
    ]);

    const sales = salesRows.map((row) =>
      this.buildTransactionRow('SALE', row, {
        gstAmount: 0,
        notes: '',
      }),
    );

    const purchases = purchaseRows.map((row) =>
      this.buildTransactionRow('PURCHASE', row, {
        gstAmount: 0,
        notes: '',
      }),
    );

    const billing = billingRows.map((row) =>
      this.buildTransactionRow(
        String(row.billType ?? 'SALE').toUpperCase() === 'PURCHASE' ? 'PURCHASE_BILL' : 'SALES_INVOICE',
        row,
        {
        gstAmount: row.gstAmount,
          notes: [row.notes, row.transportCharges ? `Transport: ${this.toNumber(row.transportCharges)}` : '']
            .filter(Boolean)
            .join(' | '),
          counterparty: String(row.billType ?? 'SALE').toUpperCase() === 'PURCHASE' ? row.supplierCounterparty : row.counterparty,
        },
      ),
    );

    const rows = [...sales, ...purchases, ...billing].sort((left, right) =>
      right.date.localeCompare(left.date),
    );

    return {
      rows,
      generatedAt: new Date().toISOString(),
      scope: {
        companyId: companyId ?? null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
    };
  }

  private buildMonthlySnapshot(
    sales: Array<Pick<SaleEntity, 'saleDate' | 'totalAmount'>>,
    purchases: Array<Pick<PurchaseEntity, 'purchaseDate' | 'totalAmount'>>,
    billing: Array<Pick<BillingEntity, 'invoiceDate' | 'totalAmount'>>,
  ): MonthlyRow[] {
    const grouped = new Map<string, MonthlyRow>();

    for (const row of sales) {
      const key = this.monthKey(row.saleDate);
      const current = grouped.get(key) ?? { month: key, sales: 0, purchases: 0, billed: 0 };
      current.sales += this.toNumber(row.totalAmount);
      grouped.set(key, current);
    }

    for (const row of purchases) {
      const key = this.monthKey(row.purchaseDate);
      const current = grouped.get(key) ?? { month: key, sales: 0, purchases: 0, billed: 0 };
      current.purchases += this.toNumber(row.totalAmount);
      grouped.set(key, current);
    }

    for (const row of billing) {
      const key = this.monthKey(row.invoiceDate);
      const current = grouped.get(key) ?? { month: key, sales: 0, purchases: 0, billed: 0 };
      current.billed += this.toNumber(row.totalAmount);
      grouped.set(key, current);
    }

    return [...grouped.values()].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
  }

  private monthKey(dateText: string): string {
    const date = new Date(dateText);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
  }

  private toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private applyCommonFilters(
    queryBuilder: {
      andWhere: (condition: string, parameters?: Record<string, string | number>) => unknown;
    },
    alias: string,
    dateField: string,
    companyId?: number,
    startDate?: string,
    endDate?: string,
  ) {
    if (companyId) {
      queryBuilder.andWhere(`${alias}.companyId = :companyId`, { companyId });
    }

    if (startDate) {
      queryBuilder.andWhere(`${alias}.${dateField} >= :startDate`, { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere(`${alias}.${dateField} <= :endDate`, { endDate });
    }
  }

  private buildTransactionRow(
    source: TransactionRow['source'],
    raw: Record<string, string | number | null>,
    extras: {
      gstAmount: string | number | null;
      notes: string | number | null;
      counterparty?: string | number | null;
    },
  ): TransactionRow {
    return {
      source,
      date: String(raw.date ?? ''),
      reference: String(raw.reference ?? ''),
      companyId: raw.companyId ? Number(raw.companyId) : null,
      counterparty: String(extras.counterparty ?? raw.counterparty ?? ''),
      paymentStatus: String(raw.paymentStatus ?? ''),
      amount: this.toNumber(raw.amount),
      gstAmount: this.toNumber(extras.gstAmount),
      notes: String(extras.notes ?? ''),
    };
  }
}
