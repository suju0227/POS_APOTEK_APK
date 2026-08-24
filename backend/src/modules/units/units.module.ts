import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  imports: [PrismaModule],
  controllers: [UnitsController],
  providers: [UnitsService],
})
export class UnitsModule {}
