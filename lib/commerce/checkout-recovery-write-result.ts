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
