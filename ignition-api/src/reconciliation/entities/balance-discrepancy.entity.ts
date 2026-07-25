import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ReconciliationStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
}

@Entity('balance_discrepancies')
export class BalanceDiscrepancy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  walletId: string;

  @Column()
  stellarAddress: string;

  @Column('decimal', { precision: 18, scale: 7 })
  dbBalance: string;

  @Column('decimal', { precision: 18, scale: 7 })
  onChainBalance: string;

  @Column('decimal', { precision: 18, scale: 7 })
  driftAmount: string;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.PENDING,
  })
  status: ReconciliationStatus;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}