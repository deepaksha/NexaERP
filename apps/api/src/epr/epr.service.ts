import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AllocateEprCertificateDto } from './dto/allocate-epr-certificate.dto';
import { CreateEprCertificateDto } from './dto/create-epr-certificate.dto';
import { CreateEprFilingEventDto } from './dto/create-epr-filing-event.dto';
import { CreateEprObligationDto } from './dto/create-epr-obligation.dto';
import { CreateEprRegistrationDto } from './dto/create-epr-registration.dto';
import { EprAnnualObligationEntity } from './epr-annual-obligation.entity';
import { EprCertificateAllocationEntity } from './epr-certificate-allocation.entity';
import { EprFilingEventEntity } from './epr-filing-event.entity';
import { EprRecyclingCertificateEntity } from './epr-recycling-certificate.entity';
import { EprRegistrationEntity } from './epr-registration.entity';

@Injectable()
export class EprService {
  constructor(
    @InjectRepository(EprRegistrationEntity)
    private readonly registrationsRepository: Repository<EprRegistrationEntity>,
    @InjectRepository(EprFilingEventEntity)
    private readonly filingsRepository: Repository<EprFilingEventEntity>,
    @InjectRepository(EprAnnualObligationEntity)
    private readonly obligationsRepository: Repository<EprAnnualObligationEntity>,
    @InjectRepository(EprRecyclingCertificateEntity)
    private readonly certificatesRepository: Repository<EprRecyclingCertificateEntity>,
    @InjectRepository(EprCertificateAllocationEntity)
    private readonly allocationsRepository: Repository<EprCertificateAllocationEntity>,
  ) {}

  findRegistrations(filters: { partyId?: number; status?: string }) {
    const query = this.registrationsRepository.createQueryBuilder('registration');

    if (filters.partyId) {
      query.andWhere('registration.registrantPartyId = :partyId', { partyId: filters.partyId });
    }

    if (filters.status && filters.status !== 'all') {
      query.andWhere('LOWER(registration.registrationStatus) = :status', {
        status: filters.status.toLowerCase(),
      });
    }

    return query.orderBy('registration.createdAt', 'DESC').getMany();
  }

  async createRegistration(dto: CreateEprRegistrationDto) {
    const registrationNumber = dto.registrationNumber.trim().toUpperCase();
    const exists = await this.registrationsRepository.findOne({ where: { registrationNumber } });

    if (exists) {
      throw new BadRequestException(`EPR registration number ${registrationNumber} already exists`);
    }

    const entity = this.registrationsRepository.create({
      registrantPartyId: dto.registrantPartyId,
      eprRoleId: dto.eprRoleId,
      registrationNumber,
      registrationAuthority: dto.registrationAuthority ?? 'CPCB',
      registrationStatus: dto.registrationStatus ?? 'ACTIVE',
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
      certificateAttachmentId: dto.certificateAttachmentId,
    });

    return this.registrationsRepository.save(entity);
  }

  findFilings(registrationId?: number) {
    const query = this.filingsRepository.createQueryBuilder('filing');

    if (registrationId) {
      query.andWhere('filing.eprRegistrationId = :registrationId', { registrationId });
    }

    return query.orderBy('filing.createdAt', 'DESC').getMany();
  }

  async createFiling(dto: CreateEprFilingEventDto) {
    const registration = await this.registrationsRepository.findOne({
      where: { id: dto.eprRegistrationId },
    });

    if (!registration) {
      throw new NotFoundException(`EPR registration with ID ${dto.eprRegistrationId} not found`);
    }

    const isAllowedStatus = ['ACTIVE', 'PENDING_RENEWAL'].includes(
      (registration.registrationStatus ?? '').toUpperCase(),
    );

    if (!isAllowedStatus && dto.filingStatus !== 'DRAFT') {
      throw new BadRequestException('Only active registrations can submit non-draft filings');
    }

    const filing = this.filingsRepository.create({
      eprRegistrationId: dto.eprRegistrationId,
      filingPeriod: dto.filingPeriod.trim(),
      filingType: dto.filingType,
      filingStatus: dto.filingStatus,
      acknowledgementNumber: dto.acknowledgementNumber?.trim() || undefined,
      submittedOn:
        dto.filingStatus === 'SUBMITTED' || dto.filingStatus === 'UNDER_REVIEW' || dto.filingStatus === 'APPROVED'
          ? new Date()
          : undefined,
      dueOn: dto.dueOn,
      filingPayload: dto.filingPayload,
    });

    return this.filingsRepository.save(filing);
  }

  findObligations(registrationId?: number) {
    const query = this.obligationsRepository.createQueryBuilder('obligation');

    if (registrationId) {
      query.andWhere('obligation.eprRegistrationId = :registrationId', { registrationId });
    }

    return query
      .orderBy('obligation.obligationYear', 'DESC')
      .addOrderBy('obligation.createdAt', 'DESC')
      .getMany();
  }

  async createObligation(dto: CreateEprObligationDto) {
    const registration = await this.registrationsRepository.findOne({
      where: { id: dto.eprRegistrationId },
    });

    if (!registration) {
      throw new NotFoundException(`EPR registration with ID ${dto.eprRegistrationId} not found`);
    }

    const existing = await this.obligationsRepository.findOne({
      where: {
        eprRegistrationId: dto.eprRegistrationId,
        obligationYear: dto.obligationYear,
        materialCategoryId: dto.materialCategoryId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Obligation already exists for year ${dto.obligationYear} and selected category`,
      );
    }

    const obligation = this.obligationsRepository.create({
      eprRegistrationId: dto.eprRegistrationId,
      obligationYear: dto.obligationYear,
      materialCategoryId: dto.materialCategoryId,
      targetQuantityMt: dto.targetQuantityMt,
      carryForwardMt: dto.carryForwardMt,
    });

    return this.obligationsRepository.save(obligation);
  }

  findCertificates(beneficiaryPartyId?: number) {
    const query = this.certificatesRepository.createQueryBuilder('certificate');

    if (beneficiaryPartyId) {
      query.andWhere('certificate.beneficiaryPartyId = :beneficiaryPartyId', { beneficiaryPartyId });
    }

    return query.orderBy('certificate.issueDate', 'DESC').addOrderBy('certificate.id', 'DESC').getMany();
  }

  async createCertificate(dto: CreateEprCertificateDto) {
    const certificateNumber = dto.certificateNumber.trim().toUpperCase();
    const existing = await this.certificatesRepository.findOne({ where: { certificateNumber } });

    if (existing) {
      throw new BadRequestException(`Certificate number ${certificateNumber} already exists`);
    }

    const certificate = this.certificatesRepository.create({
      certificateNumber,
      issuerPartyId: dto.issuerPartyId,
      beneficiaryPartyId: dto.beneficiaryPartyId,
      materialCategoryId: dto.materialCategoryId,
      certificateQuantityMt: dto.certificateQuantityMt,
      issueDate: dto.issueDate,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      statusCode: dto.statusCode ?? 'ACTIVE',
      evidenceAttachmentId: dto.evidenceAttachmentId,
    });

    return this.certificatesRepository.save(certificate);
  }

  async allocateCertificate(dto: AllocateEprCertificateDto) {
    const certificate = await this.certificatesRepository.findOne({ where: { id: dto.certificateId } });
    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${dto.certificateId} not found`);
    }

    const obligation = await this.obligationsRepository.findOne({ where: { id: dto.eprObligationId } });
    if (!obligation) {
      throw new NotFoundException(`Obligation with ID ${dto.eprObligationId} not found`);
    }

    if (Number(certificate.materialCategoryId) !== Number(obligation.materialCategoryId)) {
      throw new BadRequestException('Certificate material category must match obligation material category');
    }

    const currentAllocatedRaw = await this.allocationsRepository
      .createQueryBuilder('allocation')
      .select('COALESCE(SUM(allocation.allocatedQuantityMt), 0)', 'sumAllocated')
      .where('allocation.certificateId = :certificateId', { certificateId: dto.certificateId })
      .getRawOne<{ sumAllocated: string }>();

    const currentAllocated = Number(currentAllocatedRaw?.sumAllocated ?? 0);
    const nextAllocated = Number((currentAllocated + dto.allocatedQuantityMt).toFixed(3));
    const certificateQty = Number(certificate.certificateQuantityMt ?? 0);

    if (nextAllocated > certificateQty) {
      throw new BadRequestException(
        `Allocation exceeds certificate quantity. Available: ${(certificateQty - currentAllocated).toFixed(3)} MT`,
      );
    }

    const allocation = this.allocationsRepository.create({
      certificateId: dto.certificateId,
      eprObligationId: dto.eprObligationId,
      allocatedQuantityMt: dto.allocatedQuantityMt,
      allocationDate: dto.allocationDate ?? new Date().toISOString().slice(0, 10),
    });

    const saved = await this.allocationsRepository.save(allocation);

    const utilizationRatio = certificateQty <= 0 ? 0 : nextAllocated / certificateQty;
    const nextStatus =
      utilizationRatio <= 0
        ? 'ACTIVE'
        : utilizationRatio < 1
          ? 'PARTIALLY_UTILIZED'
          : 'FULLY_UTILIZED';

    if (certificate.statusCode !== nextStatus) {
      certificate.statusCode = nextStatus;
      await this.certificatesRepository.save(certificate);
    }

    return saved;
  }
}
