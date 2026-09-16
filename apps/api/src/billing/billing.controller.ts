import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express';
import { CreateBillingDto } from './dto/create-billing.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const target = join(process.cwd(), 'uploads', 'billing-bills');
          mkdirSync(target, { recursive: true });
          cb(null, target);
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname || '').toLowerCase();
          const safeExt = extension || '.bin';
          const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `bill-${stamp}${safeExt}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          cb(new BadRequestException('Only PDF, JPG, PNG, and WEBP files are allowed'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadAttachment(@UploadedFile() file: { filename: string; originalname: string; mimetype: string; size: number }) {
    if (!file) {
      throw new BadRequestException('Bill file is required');
    }

    return {
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/api/billing/attachments/${file.filename}`,
    };
  }

  @Get('attachments/:fileName')
  readAttachment(
    @Param('fileName') fileName: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!/^[A-Za-z0-9._-]+$/.test(fileName)) {
      throw new BadRequestException('Invalid file name');
    }

    const target = join(process.cwd(), 'uploads', 'billing-bills', fileName);
    if (!existsSync(target)) {
      throw new NotFoundException('Attachment file not found');
    }

    const extension = extname(fileName).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    response.setHeader('Content-Type', contentTypeMap[extension] ?? 'application/octet-stream');
    return new StreamableFile(createReadStream(target));
  }

  @Get()
  findAll(
    @Query('companyId') companyId?: string,
    @Query('billType') billType?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const parsedCompanyId = companyId && companyId !== 'all' ? Number(companyId) : undefined;
    return this.billingService.findAll({
      companyId: parsedCompanyId,
      billType,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateBillingDto) {
    return this.billingService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateBillingDto) {
    return this.billingService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.remove(id);
  }
}
