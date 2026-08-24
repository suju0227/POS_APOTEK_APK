import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get('ready-for-payment')
  @Roles('KASIR', 'MANAGER')
  findReadyForPayment() {
    return this.prescriptionsService.findReadyForPayment();
  }

  @Get()
  @Roles('APOTEKER', 'MANAGER')
  findAll() {
    return this.prescriptionsService.findAll();
  }

  @Post()
  @Roles('APOTEKER', 'MANAGER')
  create(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: AuthUser) {
    return this.prescriptionsService.create(dto, user.id);
  }

  @Get(':id')
  @Roles('APOTEKER', 'MANAGER')
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Patch(':id')
  @Roles('APOTEKER', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdatePrescriptionDto) {
    return this.prescriptionsService.update(id, dto);
  }

  @Post(':id/mark-ready-for-payment')
  @Roles('APOTEKER', 'MANAGER')
  markReadyForPayment(@Param('id') id: string) {
    return this.prescriptionsService.markReadyForPayment(id);
  }

  @Post(':id/cancel')
  @Roles('APOTEKER', 'MANAGER')
  cancel(@Param('id') id: string) {
    return this.prescriptionsService.cancel(id);
  }
}
