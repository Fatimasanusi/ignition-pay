import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Dispute, DisputeStatus } from './entities/dispute.entity';
import { Donation, DonationStatus } from '../donations/entities/donation.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ResolveDisputeDto, DisputeResolutionOutcome } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Resolves an open dispute, updates the linked donation status (if refunded),
   * and dispatches notifications to both donor and recipient.
   */
  async resolveDispute(
    disputeId: string,
    adminId: string,
    dto: ResolveDisputeDto,
  ): Promise<Dispute> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dispute = await queryRunner.manager.findOne(Dispute, {
        where: { id: disputeId },
        relations: ['donation', 'donor', 'recipient'],
      });

      if (!dispute) {
        throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
      }

      if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Dispute ${disputeId} is already resolved or closed (current status: ${dispute.status})`,
        );
      }

      const donation = dispute.donation;

      if (dto.outcome === DisputeResolutionOutcome.REFUNDED) {
        dispute.status = DisputeStatus.RESOLVED_REFUNDED;
        donation.status = DonationStatus.REFUNDED;
        await queryRunner.manager.save(Donation, donation);
      } else {
        dispute.status = DisputeStatus.RESOLVED_REJECTED;
      }

      dispute.resolvedBy = adminId;
      dispute.resolutionNotes = dto.resolutionNotes;
      dispute.resolvedAt = new Date();

      const updatedDispute = await queryRunner.manager.save(Dispute, dispute);

      await queryRunner.commitTransaction();

      // Dispatch non-blocking notifications post-commit
      this.dispatchResolutionNotifications(updatedDispute, dto.outcome).catch((err) => {
        this.logger.error(`Failed to dispatch dispute notifications for ${disputeId}:`, err.stack);
      });

      return updatedDispute;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async dispatchResolutionNotifications(
    dispute: Dispute,
    outcome: DisputeResolutionOutcome,
  ): Promise<void> {
    const isRefunded = outcome === DisputeResolutionOutcome.REFUNDED;

    await Promise.all([
      this.notificationsService.send({
        recipientId: dispute.donor.id,
        subject: `Dispute Resolved: ${isRefunded ? 'Refund Processed' : 'Dispute Closed'}`,
        body: `Your dispute for donation #${dispute.donation.id} has been resolved. Outcome: ${outcome}.`,
      }),
      this.notificationsService.send({
        recipientId: dispute.recipient.id,
        subject: `Dispute Update for Donation #${dispute.donation.id}`,
        body: `The dispute filed on donation #${dispute.donation.id} has been resolved with outcome: ${outcome}.`,
      }),
    ]);
  }
}