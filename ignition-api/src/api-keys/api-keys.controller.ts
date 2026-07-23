import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createHash, randomBytes } from 'crypto';
import { Request } from 'express';
import { AdminGuard } from '../users/guards/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permission } from '../auth/permissions/permissions.map';
import { RequirePermissions } from '../auth/permissions/require-permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface JwtUser {
  sub: string;
  walletAddress: string;
  role: string;
}

@ApiTags('api-keys')
@ApiBearerAuth('JWT-auth')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key successfully created' })
  async create(@Req() req: Request & { user: JwtUser }) {
    const rawKey = `sk_${randomBytes(32).toString('hex')}`;
    const prefix = rawKey.slice(0, 12);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const existingActiveKey = await this.prisma.apiKey.findFirst({
      where: {
        prefix,
        isActive: true,
      },
    });

    if (existingActiveKey) {
      throw new ConflictException(
        'An active API key already exists for this prefix',
      );
    }

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId: req.user.sub,
        name: `API Key ${new Date().toISOString().slice(0, 10)}`,
        keyHash,
        prefix,
        scope: 'read',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: req.user.sub,
        action: 'ADMIN_ACTION',
        resourceType: 'ApiKey',
        resourceId: apiKey.id,
        details: JSON.stringify({
          action: 'API_KEY_CREATED',
          prefix,
          scope: 'read',
        }),
      },
    });

    // Return the raw key only once — it cannot be recovered after this response
    return {
      id: apiKey.id,
      key: rawKey,
      prefix: apiKey.prefix,
      scope: apiKey.scope,
      createdAt: apiKey.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for the authenticated user' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  async list(@Req() req: Request & { user: JwtUser }) {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        userId: req.user.sub,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scope: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { apiKeys };
  }

  @Get('admin/users/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions(Permission.APIKEY_MANAGE_ANY)
  @ApiOperation({ summary: 'List API keys for a specific user (admin)' })
  @ApiResponse({
    status: 200,
    description: 'User API keys retrieved successfully',
  })
  async listForUser(@Param('userId') userId: string) {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scope: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      userId,
      apiKeys: apiKeys.map((apiKey) => ({
        ...apiKey,
        status: apiKey.isActive ? 'active' : 'revoked',
      })),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update API key metadata' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string },
    @Req() req: Request & { user: JwtUser },
  ) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id,
        userId: req.user.sub,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scope: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  @Post(':id/rotate')
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate an API key (create new, revoke old)' })
  @ApiResponse({ status: 200, description: 'API key rotated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async rotate(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtUser },
  ) {
    const existingKey = await this.prisma.apiKey.findFirst({
      where: {
        id,
        userId: req.user.sub,
      },
    });

    if (!existingKey) {
      throw new NotFoundException('API key not found');
    }

    // Generate new key
    const rawKey = `sk_${randomBytes(32).toString('hex')}`;
    const prefix = rawKey.slice(0, 12);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    // Create new key with same metadata
    const newApiKey = await this.prisma.apiKey.create({
      data: {
        userId: req.user.sub,
        name: existingKey.name,
        keyHash,
        prefix,
        scope: existingKey.scope,
      },
    });

    // Revoke old key
    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    // Return the new raw key only once
    return {
      id: newApiKey.id,
      key: rawKey,
      prefix: newApiKey.prefix,
      scope: newApiKey.scope,
      createdAt: newApiKey.createdAt,
    };
  }

  @Delete(':id')
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key successfully revoked' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revoke(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtUser },
  ) {
    const result = await this.prisma.apiKey.updateMany({
      where: {
        id,
        userId: req.user.sub,
      },
      data: {
        isActive: false,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.auditLog.create({
      data: {
        userId: req.user.sub,
        action: 'ADMIN_ACTION',
        resourceType: 'ApiKey',
        resourceId: id,
        details: JSON.stringify({
          action: 'API_KEY_REVOKED',
        }),
      },
    });

    return { message: 'API key revoked successfully' };
  }
}
