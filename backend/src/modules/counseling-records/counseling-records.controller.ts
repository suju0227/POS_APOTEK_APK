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
import { CounselingRecordsService } from './counseling-records.service';
import { CreateCounselingRecordDto } from './dto/create-counseling-record.dto';
import { UpdateCounselingRecordDto } from './dto/update-counseling-record.dto';

@Controller('counseling-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('APOTEKER', 'MANAGER')
export class CounselingRecordsController {
  constructor(
    private readonly counselingRecordsService: CounselingRecordsService,
  ) {}

  @Get()
  findAll() {
    return this.counselingRecordsService.findAll();
  }

  @Post()
  create(
    @Body() dto: CreateCounselingRecordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.counselingRecordsService.create(dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.counselingRecordsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCounselingRecordDto) {
    return this.counselingRecordsService.update(id, dto);
  }
}
