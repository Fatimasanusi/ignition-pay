import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';
import { GenerateAddressDto } from './dto/generate-address.dto';

@ApiTags('addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deposit address' })
  @ApiResponse({
    status: 201,
    description: 'Address created',
    type: AddressResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Address already exists' })
  create(@Body() dto: CreateAddressDto): Promise<AddressResponseDto> {
    return this.addressesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all deposit addresses' })
  @ApiResponse({
    status: 200,
    description: 'List of addresses',
    type: [AddressResponseDto],
  })
  findAll(): Promise<AddressResponseDto[]> {
    return this.addressesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deposit address by ID' })
  @ApiResponse({
    status: 200,
    description: 'Address found',
    type: AddressResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AddressResponseDto> {
    return this.addressesService.findOne(id);
  }

  @Get('wallet/:walletId')
  @ApiOperation({ summary: 'Get addresses by wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Addresses for wallet',
    type: [AddressResponseDto],
  })
  findByWallet(
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ): Promise<AddressResponseDto[]> {
    return this.addressesService.findByWallet(walletId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a deposit address' })
  @ApiResponse({
    status: 200,
    description: 'Address updated',
    type: AddressResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.addressesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deposit address' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.addressesService.remove(id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new deposit address for a wallet' })
  @ApiResponse({ status: 201, description: 'Address generated and allocated' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async generate(@Request() req: any, @Body() dto: GenerateAddressDto) {
    return this.addressesService.generate(req.user.sub, dto);
  }

  @Get('wallet/:walletId/user')
  @ApiOperation({
    summary: 'List all deposit addresses for a wallet belonging to user',
  })
  @ApiResponse({ status: 200, description: 'List of deposit addresses' })
  async listByWallet(@Request() req: any, @Param('walletId') walletId: string) {
    return this.addressesService.listByWallet(req.user.sub, walletId);
  }
}
