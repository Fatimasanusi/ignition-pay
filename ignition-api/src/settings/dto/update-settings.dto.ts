import { IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  /**
   * Access token TTL in seconds (minimum 5 minutes = 300s, maximum 24 hours = 86400s)
   */
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(86400)
  sessionAccessTtlSeconds?: number;

  /**
   * Absolute session TTL in seconds (minimum 1 hour = 3600s, maximum 30 days = 2592000s)
   */
  @IsOptional()
  @IsInt()
  @Min(3600)
  @Max(2592000)
  sessionTtlSeconds?: number;

  /**
   * Idle timeout in seconds - session expires if not updated within this time
   * (minimum 5 minutes = 300s, maximum 7 days = 604800s)
   */
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(604800)
  sessionIdleTimeoutSeconds?: number;

  /**
   * Whether to enable session persistence (extend session on activity)
   */
  @IsOptional()
  @IsBoolean()
  sessionPersistenceEnabled?: boolean;
}