-- Performance Indexes Migration
-- This migration adds composite indexes for common query patterns to improve database performance

-- User model composite indexes
-- For filtering users by role and active status, ordered by creation date
CREATE INDEX idx_users_role_isactive_createdat ON users(role, isActive, createdAt DESC);

-- For filtering users by KYC status
CREATE INDEX idx_users_kycstatus_createdat ON users(kycStatus, createdAt DESC);

-- For filtering active users
CREATE INDEX idx_users_isactive_createdat ON users(isActive, createdAt DESC) WHERE isActive = true;

-- Campaign model composite indexes
-- For filtering campaigns by status, ordered by creation date
CREATE INDEX idx_campaigns_status_createdat ON campaigns(status, createdAt DESC);

-- For filtering campaigns by creator and status
CREATE INDEX idx_campaigns_creator_status_createdat ON campaigns(creatorId, status, createdAt DESC);

-- For filtering campaigns by category and status
CREATE INDEX idx_campaigns_category_status ON campaigns(category, status);

-- Donation model composite indexes
-- For filtering donations by campaign and status, ordered by creation date
CREATE INDEX idx_donations_campaign_status_createdat ON donations(campaignId, status, createdAt DESC);

-- For filtering donations by donor and status
CREATE INDEX idx_donations_donor_status_createdat ON donations(donorId, status, createdAt DESC);

-- For filtering donations by status and date range
CREATE INDEX idx_donations_status_createdat ON donations(status, createdAt DESC);

-- Transaction model composite indexes
-- For filtering outgoing transactions by wallet and status
CREATE INDEX idx_transactions_fromwallet_status_createdat ON transactions(fromWalletId, status, createdAt DESC);

-- For filtering incoming transactions by wallet and status
CREATE INDEX idx_transactions_towallet_status_createdat ON transactions(toWalletId, status, createdAt DESC);

-- For filtering transactions by status and date
CREATE INDEX idx_transactions_status_createdat ON transactions(status, createdAt DESC);

-- Notification model composite indexes
-- For filtering notifications by user and read status, ordered by creation date
CREATE INDEX idx_notifications_user_isread_createdat ON notifications(userId, isRead, createdAt DESC);

-- For filtering unread notifications by user
CREATE INDEX idx_notifications_user_unread ON notifications(userId, createdAt DESC) WHERE isRead = false;

-- Dispute model composite indexes
-- For filtering disputes by campaign and status
CREATE INDEX idx_disputes_campaign_status_createdat ON disputes(campaignId, status, createdAt DESC);

-- For filtering disputes by filer
CREATE INDEX idx_disputes_filer_status_createdat ON disputes(filerId, status, createdAt DESC);

-- AuditLog model composite indexes
-- For filtering audit logs by user and action
CREATE INDEX idx_auditlogs_user_action_createdat ON audit_logs(userId, action, createdAt DESC);

-- For filtering audit logs by resource type and ID
CREATE INDEX idx_auditlogs_resource_type_id ON audit_logs(resourceType, resourceId);

-- Wallet model composite indexes
-- For filtering wallets by user and status
CREATE INDEX idx_wallets_user_status_createdat ON wallets(userId, status, createdAt DESC);

-- For filtering active wallets by network
CREATE INDEX idx_wallets_network_status ON wallets(network, status) WHERE isActive = true;

-- Milestone model composite indexes
-- For filtering milestones by campaign and status
CREATE INDEX idx_milestones_campaign_status ON milestones(campaignId, status);

-- Update model composite indexes
-- For filtering updates by campaign, ordered by creation date
CREATE INDEX idx_updates_campaign_createdat ON updates(campaignId, createdAt DESC);

-- Address model composite indexes
-- For filtering addresses by wallet and active status
CREATE INDEX idx_addresses_wallet_isactive ON addresses(walletId, isActive);

-- For filtering active addresses by network
CREATE INDEX idx_addresses_network_isactive ON addresses(network, isActive) WHERE isActive = true;

-- DepositAddress model composite indexes
-- For filtering deposit addresses by wallet and status
CREATE INDEX idx_deposit_addresses_wallet_status ON deposit_addresses(walletId, status);

-- For filtering active deposit addresses by network
CREATE INDEX idx_deposit_addresses_network_status ON deposit_addresses(network, status) WHERE isActive = true;

-- Newsletter model composite indexes
-- For filtering subscribed newsletters
CREATE INDEX idx_newsletters_is_subscribed_createdat ON newsletters(isSubscribed, createdAt DESC) WHERE isSubscribed = true;

-- EmailVerificationToken model composite indexes
-- For finding valid (unused and not expired) tokens
CREATE INDEX idx_email_verification_tokens_user_valid ON email_verification_tokens(userId, expiresAt) WHERE usedAt IS NULL;

-- ApiKey model composite indexes
-- For filtering active API keys by user
CREATE INDEX idx_api_keys_user_isactive ON api_keys(userId, isActive) WHERE isActive = true;