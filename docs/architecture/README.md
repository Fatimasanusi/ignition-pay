# Architecture

This directory contains architecture documentation for the Ignition Pay platform.

## Contents

- [System Overview](./system-overview.md) — High-level architecture, component relationships, and data flow
- [Frontend Architecture](./frontend-architecture.md) — Next.js frontend structure and patterns
- [API Architecture](./api-architecture.md) — NestJS API layer design
- [Mobile Architecture](./mobile-architecture.md) — Flutter mobile app architecture

## Key Principles

- **Separation of concerns**: Each layer (frontend, API, mobile) owns one responsibility
- **SEP compliance**: All Stellar Ecosystem Proposals are implemented as first-class citizens
- **Type safety**: TypeScript (web) and Dart (mobile/API) provide end-to-end type safety
- **Non-custodial**: Users control their private keys at all times
