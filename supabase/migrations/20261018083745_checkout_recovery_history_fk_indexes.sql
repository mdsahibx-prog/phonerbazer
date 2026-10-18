-- Add indexes for foreign-key lookups in checkout recovery history.
-- These columns are used for admin history joins and linked-order traceability.
create index if not exists idx_checkout_recovery_history_actor_admin_user_id
  on public.checkout_recovery_history (actor_admin_user_id);

create index if not exists idx_checkout_recovery_history_linked_order_id
  on public.checkout_recovery_history (linked_order_id);
