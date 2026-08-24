import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('search')
  search(@Query('q') search?: string) {
    return this.productsService.search(search);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.productsService.findAll(search);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.productsService.deactivate(id);
  }

  @Get(':productId/units')
  findUnits(@Param('productId') productId: string) {
    return this.productsService.findUnits(productId);
  }

  @Post(':productId/units')
  createUnit(
    @Param('productId') productId: string,
    @Body() dto: CreateProductUnitDto,
  ) {
    return this.productsService.createUnit(productId, dto);
  }

  @Patch(':productId/units/:productUnitId')
  updateUnit(
    @Param('productId') productId: string,
    @Param('productUnitId') productUnitId: string,
    @Body() dto: UpdateProductUnitDto,
  ) {
    return this.productsService.updateUnit(productId, productUnitId, dto);
  }

  @Patch(':productId/units/:productUnitId/deactivate')
  deactivateUnit(
    @Param('productId') productId: string,
    @Param('productUnitId') productUnitId: string,
  ) {
    return this.productsService.deactivateUnit(productId, productUnitId);
  }
}
