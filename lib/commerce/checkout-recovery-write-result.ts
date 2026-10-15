export type CheckoutRecoveryWriteResult = { ok: true } | { ok: false; message: string }

/**
 * Classify a conditional checkout-recovery write without treating a database
 * error or a zero-row optimistic update as success.
 */
export function checkoutRecoveryWriteResult(
  error: unknown,
  updatedId: string | null | undefined,
  failureMessage: string,
  conflictMessage: string,
): CheckoutRecoveryWriteResult {
  if (error) return { ok: false, message: failureMessage }
  if (!updatedId) return { ok: false, message: conflictMessage }
  return { ok: true }
}

export type CheckoutRecoveryLookupResult<T> = { ok: true; data: T } | { ok: false; message: string }

/** Distinguish an unavailable database lookup from a valid query returning no row. */
export function checkoutRecoveryLookupResult<T>(
  error: unknown,
  data: T | null | undefined,
  failureMessage: string,
  notFoundMessage: string,
): CheckoutRecoveryLookupResult<T> {
  if (error) return { ok: false, message: failureMessage }
  if (data == null) return { ok: false, message: notFoundMessage }
  return { ok: true, data }
}
