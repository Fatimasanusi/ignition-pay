import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { InitiateSep24Dto, Sep24Operation, GetSep24HistoryQueryDto } from './dto/initiate-sep24.dto'
import type { Sep24HistoryItemDto, Sep24HistoryResponseDto } from './dto/sep24-response.dto'

const ANCHOR_CONFIGS: Record<string, { domain: string; sep10?: string }> = {
  StellarX: { domain: 'https://api.stellarx.com' },
  AnchorUSD: { domain: 'https://api.anchorusd.com' },
  GateHub: { domain: 'https://api.gatehub.com' },
  PayMunk: { domain: 'https://api.paymunk.com' },
}

const SEP_24_DEPOSIT_STATUSES = [
  'incomplete',
  'pending_user_transfer_start',
  'pending_external',
  'pending_anchor',
  'pending_stellar',
  'pending_trust',
  'pending_user',
  'completed',
  'no_market',
  'too_small',
  'too_large',
  'expired',
  'error',
] as const

function isValidSep24Status(status: string): boolean {
  return SEP_24_DEPOSIT_STATUSES.includes(status as any)
}

@Injectable()
export class Sep24Service {
  constructor(private readonly prisma: PrismaService) {}

  private getAnchorConfig(anchorName: string): { domain: string } {
    const config = ANCHOR_CONFIGS[anchorName]
    if (!config) {
      throw new NotFoundException(`Unknown anchor: ${anchorName}`)
    }
    return config
  }

  async initiate(req: InitiateSep24Dto, userId: string): Promise<{
    id: string
    anchorTxId: string
    interactiveUrl: string
    status: string
    statusDesc?: string
    moreInfoUrl?: string
    startedAt: Date
  }> {
    const config = this.getAnchorConfig(req.anchorName)

    const endpoint =
      req.operation === Sep24Operation.DEPOSIT
        ? '/transactions/deposit/interactive'
        : '/transactions/withdraw/interactive'

    const body: Record<string, any> = {
      asset_code: req.assetCode,
      account: req.stellarAccount,
    }
    if (req.assetIssuer) body.asset_issuer = req.assetIssuer
    if (req.amount != null) body.amount = req.amount.toString()

    const url = `${config.domain}${endpoint}`

    let anchorResponse: any
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new BadRequestException(
          `Anchor returned ${response.status}: ${errorText}`,
        )
      }
      anchorResponse = await response.json()
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      // If the real anchor is unreachable, simulate a response for development
      anchorResponse = this.simulateAnchorResponse(req, config.domain)
    }

    const anchorTxId: string = anchorResponse.id ?? `sim-${Date.now()}`
    const interactiveUrl: string =
      anchorResponse.url ?? `${config.domain}/sep24/interactive/${anchorTxId}`

    const record = await this.prisma.sep24Transaction.create({
      data: {
        userId,
        anchorName: req.anchorName,
        operation: req.operation,
        stellarAccount: req.stellarAccount,
        assetCode: req.assetCode,
        assetIssuer: req.assetIssuer ?? null,
        amount: req.amount != null ? req.amount : null,
        anchorTxId,
        interactiveUrl,
        status: 'incomplete',
        rawAnchorResponse: anchorResponse,
      },
    })

    return {
      id: record.id,
      anchorTxId,
      interactiveUrl,
      status: 'incomplete',
      statusDesc: 'Awaiting user interaction with the anchor',
      startedAt: record.startedAt,
    }
  }

  async getStatus(
    txId: string,
  ): Promise<{
    id: string
    anchorTxId: string
    status: string
    statusDesc?: string
    moreInfoUrl?: string
    stellarTxHash?: string
    externalTxId?: string
    message?: string
    amountIn?: string
    amountOut?: string
    feeDetails?: Record<string, unknown>
    startedAt: Date
    completedAt?: Date
  }> {
    const record = await this.prisma.sep24Transaction.findUnique({
      where: { id: txId },
    })
    if (!record) {
      throw new NotFoundException('SEP-24 transaction not found')
    }

    const config = this.getAnchorConfig(record.anchorName)

    let anchorStatus: any
    try {
      const response = await fetch(
        `${config.domain}/transactions/${record.anchorTxId}`,
        { headers: { Accept: 'application/json' } },
      )
      if (response.ok) {
        const data = await response.json()
        anchorStatus = data.transaction ?? data
      }
    } catch {
      // Simulate status progression for development
      anchorStatus = this.simulateStatusUpdate(record)
    }

    const status = anchorStatus?.status ?? record.status
    const normalizedStatus = isValidSep24Status(status) ? status : record.status

    if (normalizedStatus !== record.status) {
      const updateData: any = { status: normalizedStatus }
      if (normalizedStatus === 'completed') {
        updateData.completedAt = new Date()
      }
      if (anchorStatus?.stellar_transaction_hash) {
        updateData.stellarTxHash = anchorStatus.stellar_transaction_hash
      }
      if (anchorStatus?.more_info_url) {
        updateData.moreInfoUrl = anchorStatus.more_info_url
      }
      if (anchorStatus?.message) {
        updateData.message = anchorStatus.message
      }
      await this.prisma.sep24Transaction.update({
        where: { id: txId },
        data: {
          ...updateData,
          rawAnchorResponse: anchorStatus,
        },
      })
    }

    return {
      id: record.id,
      anchorTxId: record.anchorTxId!,
      status: normalizedStatus,
      statusDesc: anchorStatus?.statusDescription ?? undefined,
      moreInfoUrl: anchorStatus?.more_info_url ?? record.moreInfoUrl ?? undefined,
      stellarTxHash:
        anchorStatus?.stellar_transaction_hash ?? record.stellarTxHash ?? undefined,
      externalTxId: anchorStatus?.external_transaction_id ?? undefined,
      message: anchorStatus?.message ?? record.message ?? undefined,
      amountIn: anchorStatus?.amount_in?.toString() ?? record.amount?.toString(),
      amountOut: anchorStatus?.amount_out?.toString() ?? undefined,
      feeDetails: anchorStatus?.fee_details ?? undefined,
      startedAt: record.startedAt,
      completedAt: record.completedAt ?? undefined,
    }
  }

  async findById(id: string): Promise<{ anchorName: string; anchorTxId: string }> {
    const record = await this.prisma.sep24Transaction.findUnique({
      where: { id },
    })
    if (!record) {
      throw new NotFoundException('SEP-24 transaction not found')
    }
    return { anchorName: record.anchorName, anchorTxId: record.anchorTxId! }
  }

  async getHistory(
    userId: string,
    query: GetSep24HistoryQueryDto,
  ): Promise<Sep24HistoryResponseDto> {
    const page = Math.max(1, query.page ?? 1)
    const limit = Math.min(100, Math.max(1, query.limit ?? 20))
    const skip = (page - 1) * limit

    const where: Record<string, any> = { userId }
    if (query.operation) where.operation = query.operation
    if (query.anchorName) where.anchorName = query.anchorName

    const [records, total] = await Promise.all([
      this.prisma.sep24Transaction.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          anchorName: true,
          operation: true,
          assetCode: true,
          assetIssuer: true,
          amount: true,
          status: true,
          statusDesc: true,
          anchorTxId: true,
          stellarTxHash: true,
          moreInfoUrl: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      this.prisma.sep24Transaction.count({ where }),
    ])

    const items: Sep24HistoryItemDto[] = records.map((r) => ({
      id: r.id,
      anchorName: r.anchorName,
      operation: r.operation as 'deposit' | 'withdraw',
      assetCode: r.assetCode,
      assetIssuer: r.assetIssuer ?? undefined,
      amount: r.amount != null ? r.amount.toString() : undefined,
      status: r.status,
      statusDesc: r.statusDesc ?? undefined,
      anchorTxId: r.anchorTxId ?? undefined,
      stellarTxHash: r.stellarTxHash ?? undefined,
      moreInfoUrl: r.moreInfoUrl ?? undefined,
      startedAt: r.startedAt,
      completedAt: r.completedAt ?? undefined,
    }))

    return { items, total, page, limit }
  }

  private simulateAnchorResponse(
    req: InitiateSep24Dto,
    _domain: string,
  ): any {
    const txId = `sim-${Date.now()}`
    return {
      id: txId,
      url: `/sep24/interactive-simulator?txId=${txId}&operation=${req.operation}&asset=${req.assetCode}`,
      status: 'incomplete',
      statusDescription: 'Interactive flow initiated',
    }
  }

  private simulateStatusUpdate(record: any): any {
    const elapsed = Date.now() - new Date(record.startedAt).getTime()
    const minutes = elapsed / 60000

    if (minutes < 1) {
      return { status: 'incomplete', statusDescription: 'User is completing the interactive flow' }
    }
    if (minutes < 2) {
      return { status: 'pending_anchor', statusDescription: 'Anchor is processing the transaction' }
    }
    if (minutes < 3) {
      return { status: 'pending_stellar', statusDescription: 'Stellar transaction is being submitted' }
    }
    return {
      status: 'completed',
      statusDescription: 'Transaction completed successfully',
      stellar_transaction_hash: `sim-${record.anchorTxId}-txhash`,
      amount_in: record.amount?.toString(),
      amount_out: record.amount?.toString(),
      fee_details: { total: '0.00001', asset: 'XLM' },
    }
  }
}
