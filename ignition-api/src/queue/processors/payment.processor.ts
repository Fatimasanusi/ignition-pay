import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_PAYMENTS } from '../queue.constants';
import { PAYMENT_JOB_PROCESS, PaymentJobPayload } from '../queue.jobs';

@Processor(QUEUE_PAYMENTS)
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  /**
   * Processes an outgoing payment job.
   *
   * Responsibilities (to be implemented as Stellar SDK integration is added):
   *  1. Load the persisted Transaction record.
   *  2. Submit the Stellar transaction to Horizon.
   *  3. Update the Transaction status to COMPLETED (or FAILED on error).
   *
   * The job retries up to 3 times with exponential back-off (configured in
   * QueueModule's defaultJobOptions) before being moved to the dead-letter set.
   */
  @Process(PAYMENT_JOB_PROCESS)
  async handlePayment(job: Job<PaymentJobPayload>): Promise<void> {
    const { transactionId, senderWalletId, recipientAddress, amount, assetCode } =
      job.data;

    this.logger.log(
      `Processing payment job ${job.id}: txn=${transactionId} ` +
        `from=${senderWalletId} to=${recipientAddress} ` +
        `amount=${amount} ${assetCode}`,
    );

    // TODO: submit to Stellar Horizon and update transaction status.
  }
}
