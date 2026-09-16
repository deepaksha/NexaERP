import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createTransport, Transporter } from 'nodemailer';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/user.entity';

type LowStockPayload = {
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  reference: string;
};

type BillingPaymentPayload = {
  invoiceNumber: string;
  billType: string;
  paymentStatus: string;
  paidAmount: number;
  balanceAmount: number;
  totalAmount: number;
  purchaseOrderId?: number;
};

type PurchaseOrderPayload = {
  poNumber: string;
  companyId: number;
  supplierId: number;
  totalAmount: number;
  approvalRequiredRole: string;
  status: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  getPurchaseOrderApprovalRules(): Array<{ minAmount: number; maxAmount: number; role: string }> {
    const configured = this.configService.get<string>('PO_APPROVAL_RULES', '');
    if (configured.trim()) {
      try {
        const parsed = JSON.parse(configured) as Array<{ minAmount: number; maxAmount: number; role: string }>;
        return parsed
          .filter((item) => Number.isFinite(Number(item.minAmount)) && Number.isFinite(Number(item.maxAmount)) && !!item.role)
          .map((item) => ({
            minAmount: Number(item.minAmount),
            maxAmount: Number(item.maxAmount),
            role: item.role.trim().toLowerCase().replace(/\s+/g, '-'),
          }))
          .sort((a, b) => a.minAmount - b.minAmount);
      } catch {
        this.logger.warn('Invalid PO_APPROVAL_RULES JSON, using default approval rules');
      }
    }

    return [
      { minAmount: 0, maxAmount: 50000, role: 'supervisor' },
      { minAmount: 50000.01, maxAmount: 200000, role: 'manager' },
      { minAmount: 200000.01, maxAmount: Number.MAX_SAFE_INTEGER, role: 'admin' },
    ];
  }

  resolveApprovalRole(totalAmount: number): string {
    const rules = this.getPurchaseOrderApprovalRules();
    const amount = Number(totalAmount || 0);
    const match = rules.find((rule) => amount >= rule.minAmount && amount <= rule.maxAmount);
    return match?.role ?? 'manager';
  }

  async notifyLowStock(payload: LowStockPayload) {
    const recipients = await this.getRecipientsForRoles([
      'inventory-manager',
      'purchase-manager',
      'manager',
      'supervisor',
      'admin',
      'super-admin',
    ]);

    await this.sendEmail(
      recipients,
      `[NexaERP] Low Stock Alert: ${payload.productName}`,
      [
        `Product: ${payload.productName} (${payload.sku})`,
        `Current stock: ${payload.currentStock}`,
        `Threshold: ${payload.threshold}`,
        `Reference: ${payload.reference}`,
        'Action: Create purchase order or stock transfer.',
      ].join('\n'),
    );
  }

  async notifyBillingPaymentUpdate(payload: BillingPaymentPayload) {
    const recipients = await this.getRecipientsForRoles([
      'accounts-manager',
      'purchase-manager',
      'manager',
      'supervisor',
      'admin',
      'super-admin',
    ]);

    await this.sendEmail(
      recipients,
      `[NexaERP] Billing Payment Update: ${payload.invoiceNumber}`,
      [
        `Invoice: ${payload.invoiceNumber}`,
        `Type: ${payload.billType}`,
        `Payment status: ${payload.paymentStatus}`,
        `Paid amount: ${payload.paidAmount}`,
        `Balance amount: ${payload.balanceAmount}`,
        `Total amount: ${payload.totalAmount}`,
        `Purchase order ID: ${payload.purchaseOrderId ?? '-'}`,
      ].join('\n'),
    );
  }

  async notifyNewPurchaseOrder(payload: PurchaseOrderPayload) {
    const recipients = await this.getRecipientsForRoles([
      payload.approvalRequiredRole,
      'purchase-manager',
      'manager',
      'supervisor',
      'admin',
      'super-admin',
    ]);

    await this.sendEmail(
      recipients,
      `[NexaERP] New Purchase Order: ${payload.poNumber}`,
      [
        `PO: ${payload.poNumber}`,
        `Company ID: ${payload.companyId}`,
        `Supplier ID: ${payload.supplierId}`,
        `Total amount: ${payload.totalAmount}`,
        `Status: ${payload.status}`,
        `Approval required role: ${payload.approvalRequiredRole}`,
      ].join('\n'),
    );
  }

  private async getRecipientsForRoles(roleSlugs: string[]): Promise<string[]> {
    const normalizedRoles = new Set(
      roleSlugs
        .map((role) => role.trim().toLowerCase().replace(/\s+/g, '-'))
        .filter(Boolean),
    );

    const users = await this.usersRepository.find({
      where: { isActive: true, isDeleted: false },
      relations: ['roles', 'roles.role'],
    });

    const roleRecipients = users
      .filter((user) => user.roles?.some((userRole) => normalizedRoles.has(userRole.role?.slug ?? '')))
      .map((user) => user.email.trim().toLowerCase());

    const staticRecipients = (this.configService.get<string>('ALERT_EMAILS', '') || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    return Array.from(new Set([...roleRecipients, ...staticRecipients]));
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get<string>('SMTP_HOST', '').trim();
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER', '').trim();
    const pass = this.configService.get<string>('SMTP_PASS', '').trim();

    if (!host || !user || !pass) {
      return null;
    }

    this.transporter = createTransport({
      host,
      port,
      secure: this.configService.get<string>('SMTP_SECURE', 'false').toLowerCase() === 'true',
      auth: { user, pass },
    });

    return this.transporter;
  }

  private async sendEmail(recipients: string[], subject: string, text: string) {
    if (!recipients.length) {
      return;
    }

    const from = this.configService.get<string>('MAIL_FROM', '').trim();
    const transporter = this.getTransporter();

    if (!from || !transporter) {
      this.logger.log(`Email skipped (SMTP not configured): ${subject} -> ${recipients.join(', ')}`);
      return;
    }

    try {
      await transporter.sendMail({
        from,
        to: recipients.join(','),
        subject,
        text,
      });
    } catch (error) {
      this.logger.error(`Failed to send email: ${subject}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
