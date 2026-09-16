import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AllocateEprCertificateDto } from './dto/allocate-epr-certificate.dto';
import { CreateEprCertificateDto } from './dto/create-epr-certificate.dto';
import { CreateEprFilingEventDto } from './dto/create-epr-filing-event.dto';
import { CreateEprObligationDto } from './dto/create-epr-obligation.dto';
import { CreateEprRegistrationDto } from './dto/create-epr-registration.dto';
import { EprCertificateAllocationResponseDto } from './dto/response/epr-certificate-allocation-response.dto';
import { EprCertificateResponseDto } from './dto/response/epr-certificate-response.dto';
import { EprFilingEventResponseDto } from './dto/response/epr-filing-event-response.dto';
import { EprObligationResponseDto } from './dto/response/epr-obligation-response.dto';
import { EprRegistrationResponseDto } from './dto/response/epr-registration-response.dto';
import { EprService } from './epr.service';

@ApiTags('EPR Compliance')
@Controller('epr')
export class EprController {
  constructor(private readonly eprService: EprService) {}

  @ApiOperation({ summary: 'List EPR registrations' })
  @ApiQuery({ name: 'partyId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiOkResponse({ type: EprRegistrationResponseDto, isArray: true })
  @Get('registrations')
  findRegistrations(@Query('partyId') partyId?: string, @Query('status') status?: string) {
    return this.eprService.findRegistrations({
      partyId: partyId ? Number(partyId) : undefined,
      status,
    });
  }

  @ApiOperation({ summary: 'Create EPR registration' })
  @ApiBody({ type: CreateEprRegistrationDto })
  @ApiCreatedResponse({ type: EprRegistrationResponseDto })
  @Post('registrations')
  createRegistration(@Body() dto: CreateEprRegistrationDto) {
    return this.eprService.createRegistration(dto);
  }

  @ApiOperation({ summary: 'List EPR filing events' })
  @ApiQuery({ name: 'registrationId', required: false, type: Number })
  @ApiOkResponse({ type: EprFilingEventResponseDto, isArray: true })
  @Get('filings')
  findFilings(@Query('registrationId') registrationId?: string) {
    return this.eprService.findFilings(registrationId ? Number(registrationId) : undefined);
  }

  @ApiOperation({ summary: 'Create EPR filing event' })
  @ApiBody({ type: CreateEprFilingEventDto })
  @ApiCreatedResponse({ type: EprFilingEventResponseDto })
  @Post('filings')
  createFiling(@Body() dto: CreateEprFilingEventDto) {
    return this.eprService.createFiling(dto);
  }

  @ApiOperation({ summary: 'List annual EPR obligations' })
  @ApiQuery({ name: 'registrationId', required: false, type: Number })
  @ApiOkResponse({ type: EprObligationResponseDto, isArray: true })
  @Get('obligations')
  findObligations(@Query('registrationId') registrationId?: string) {
    return this.eprService.findObligations(registrationId ? Number(registrationId) : undefined);
  }

  @ApiOperation({ summary: 'Create annual EPR obligation' })
  @ApiBody({ type: CreateEprObligationDto })
  @ApiCreatedResponse({ type: EprObligationResponseDto })
  @Post('obligations')
  createObligation(@Body() dto: CreateEprObligationDto) {
    return this.eprService.createObligation(dto);
  }

  @ApiOperation({ summary: 'List EPR recycling certificates' })
  @ApiQuery({ name: 'beneficiaryPartyId', required: false, type: Number })
  @ApiOkResponse({ type: EprCertificateResponseDto, isArray: true })
  @Get('certificates')
  findCertificates(@Query('beneficiaryPartyId') beneficiaryPartyId?: string) {
    return this.eprService.findCertificates(beneficiaryPartyId ? Number(beneficiaryPartyId) : undefined);
  }

  @ApiOperation({ summary: 'Create EPR recycling certificate' })
  @ApiBody({ type: CreateEprCertificateDto })
  @ApiCreatedResponse({ type: EprCertificateResponseDto })
  @Post('certificates')
  createCertificate(@Body() dto: CreateEprCertificateDto) {
    return this.eprService.createCertificate(dto);
  }

  @ApiOperation({ summary: 'Allocate certificate quantity to an obligation' })
  @ApiBody({ type: AllocateEprCertificateDto })
  @ApiCreatedResponse({ type: EprCertificateAllocationResponseDto })
  @Post('certificate-allocations')
  allocateCertificate(@Body() dto: AllocateEprCertificateDto) {
    return this.eprService.allocateCertificate(dto);
  }
}
