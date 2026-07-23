# System Overview

Ignition Pay is a full-stack, cross-platform Stellar wallet ecosystem.

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                  Clients                         │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Flutter App  │  │  Next.js Web App         │  │
│  │ (iOS/Android)│  │  (ignition-pay-frontend) │  │
│  └──────┬───────┘  └──────────┬───────────────┘  │
└─────────┼─────────────────────┼──────────────────┘
          │                     │
          │    REST + WebSocket │
          ▼                     ▼
┌─────────────────────────────────────────────────┐
│              API Layer                           │
│  ┌───────────────────────────────────────────┐  │
│  │  NestJS Backend (ignition-api)            │  │
│  │  • Auth (JWT, Stellar SEP-10)             │  │
│  │  • Wallet management                      │  │
│  │  • Transaction processing                 │  │
│  │  • Anchor orchestration (SEP-6/24/31)    │  │
│  │  • Soroban contract interaction           │  │
│  │  • Redis caching / Bull queues            │  │
│  └──────────────────┬────────────────────────┘  │
└─────────────────────┼──────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│           Blockchain Layer                       │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │ Stellar      │  │  Soroban RPC           │   │
│  │ Horizon API  │  │  (Smart Contracts)     │   │
│  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Component Overview

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| Mobile App | Flutter / Dart | Native iOS & Android wallet UI |
| Web App | Next.js / React / Tailwind | Browser-based wallet experience |
| API | NestJS / TypeScript | Business logic, auth, blockchain coordination |
| Blockchain | Stellar / Soroban | Asset transfers, smart contracts |

## Data Flow

1. Client sends HTTP/WebSocket request to API
2. API authenticates via JWT (issued via SEP-10 Stellar Web Auth)
3. API validates request, applies business logic
4. API communicates with Stellar Horizon / Soroban RPC
5. Response flows back through the same path

## Security Model

- Private keys are encrypted at rest using the user's password
- Sessions use short-lived JWTs with refresh tokens
- Database secrets are never exposed to clients
- All Horizon communication happens server-side
