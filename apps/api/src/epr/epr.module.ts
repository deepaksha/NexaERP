import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EprAnnualObligationEntity } from './epr-annual-obligation.entity';
import { EprCertificateAllocationEntity } from './epr-certificate-allocation.entity';
import { EprController } from './epr.controller';
import { EprFilingEventEntity } from './epr-filing-event.entity';
import { EprRecyclingCertificateEntity } from './epr-recycling-certificate.entity';
import { EprRegistrationEntity } from './epr-registration.entity';
import { EprService } from './epr.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EprRegistrationEntity,
      EprFilingEventEntity,
      EprAnnualObligationEntity,
      EprRecyclingCertificateEntity,
      EprCertificateAllocationEntity,
    ]),
  ],
  controllers: [EprController],
  providers: [EprService],
  exports: [EprService],
})
export class EprModule {}
