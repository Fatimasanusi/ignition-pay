# API Architecture

## Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL via Prisma ORM
- **Caching**: Redis via Keyv / cache-manager
- **Queue**: Bull (Redis-backed job queue)
- **Blockchain**: Stellar SDK + Soroban RPC

## Module Structure

```
src/
├── auth/         # Authentication (JWT, SEP-10)
├── users/        # User management
├── wallets/      # Wallet operations
├── transactions/ # Transaction processing
├── addresses/    # Address validation & routing
├── api-keys/     # API key management
├── campaigns/    # Campaign/governance features
├── health/       # Health checks
├── common/       # Shared utilities, guards, interceptors
├── config/       # Configuration modules
├── queue/        # Background job processing
├── redis/        # Redis cache layer
├── session/      # Session management
├── throttler/    # Rate limiting
└── prisma/       # Database schema and migrations
```

## Key Modules

### Auth Module
- Stellar SEP-10 Web Authentication
- JWT access + refresh token flow
- Optional biometric challenge

### Wallets Module
- Create and manage Stellar keypairs
- Encrypted private key storage
- Balance queries via Horizon

### Transactions Module
- Build and submit Stellar transactions
- Support for traditional, muxed, and contract addresses
- Transaction history with pagination

### Queue Module
- Background processing via Bull
- Transaction status polling
- Anchor deposit/withdrawal webhooks

## API Design

- RESTful endpoints with NestJS controllers
- Swagger documentation via `@nestjs/swagger`
- WebSocket gateway for real-time updates
- Rate limiting via `@nestjs/throttler`
- Validation via `class-validator` DTOs
