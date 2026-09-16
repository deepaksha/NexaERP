import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PageAccessService } from './page-access.service';

@Controller('page-access')
export class PageAccessController {
  constructor(private readonly service: PageAccessService) {}

  @Get('role/:roleId')
  getByRole(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.service.getPageAccessByRole(roleId);
  }

  @Get()
  findAll() {
    return this.service.getPageAccessByRole(0);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPageAccessByRole(id);
  }

  @Post()
  create(@Body() body: any) {
    return body;
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return { id, ...body };
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return { deleted: true, id };
  }
}
