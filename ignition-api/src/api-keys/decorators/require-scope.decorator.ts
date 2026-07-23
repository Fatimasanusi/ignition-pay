import { SetMetadata } from '@nestjs/common';

/**
 * Allowed API key scopes.
 * - 'read'       — read-only access (GET endpoints)
 * - 'write'      — write access (POST / PATCH / PUT)
 * - 'admin'      — full administrative access
 */
export type ApiKeyScope = 'read' | 'write' | 'admin';

export const API_KEY_SCOPE_KEY = 'api_key_scope';

/**
 * Attach a required scope to a controller or route handler.
 *
 * @example
 * @RequireScope('write')
 * @Post('transactions')
 * createTransaction() { ... }
 */
export const RequireScope = (...scopes: ApiKeyScope[]) =>
  SetMetadata(API_KEY_SCOPE_KEY, scopes);
