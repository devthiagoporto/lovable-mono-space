-- ====================================================================
-- SECURITY FIX: Prevent Identity Document Theft via Order Manipulation
-- ====================================================================
-- 
-- CRITICAL VULNERABILITY FOUND:
-- The 'tenant_members_can_manage_orders' policy allows ANY staff member
-- (including checkin_operator) to UPDATE orders, including changing buyer_id.
-- 
-- ATTACK SCENARIO:
-- 1. Malicious staff changes order.buyer_id to their own user ID
-- 2. They gain access to all tickets via buyers_view_order_tickets policy
-- 3. They harvest CPF numbers of all ticket holders
-- 4. Identity documents can be used for fraud
--
-- SOLUTION:
-- - Restrict order management to admins only
-- - Remove general staff access from orders table
-- - Protect buyer_id from unauthorized modification
-- - Maintain buyer and admin access for viewing
-- ====================================================================

-- Drop the overly permissive policy that allows all staff to manage orders
DROP POLICY IF EXISTS "tenant_members_can_manage_orders" ON public.orders;

-- Drop the view policy to rebuild it more securely
DROP POLICY IF EXISTS "users_can_view_own_orders" ON public.orders;

-- Policy 1: Buyers can view their own orders only
CREATE POLICY "buyers_view_own_orders" ON public.orders
FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- Policy 2: Only admins can view all tenant orders (for support/reporting)
CREATE POLICY "admins_view_tenant_orders" ON public.orders
FOR SELECT
TO authenticated
USING (is_tenant_admin(tenant_id));

-- Policy 3: Only admins can manage orders (UPDATE/DELETE)
-- Note: buyer_id should NEVER be modified after creation
CREATE POLICY "admins_manage_orders" ON public.orders
FOR ALL
TO authenticated
USING (is_tenant_admin(tenant_id))
WITH CHECK (is_tenant_admin(tenant_id));

-- ====================================================================
-- AUDIT RECOMMENDATION:
-- ====================================================================
-- Consider adding a trigger to log any buyer_id changes to audit_logs:
--
-- CREATE OR REPLACE FUNCTION audit_buyer_id_change()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF OLD.buyer_id IS DISTINCT FROM NEW.buyer_id THEN
--     INSERT INTO audit_logs (tenant_id, actor_id, acao, alvo, dados)
--     VALUES (
--       NEW.tenant_id,
--       auth.uid(),
--       'BUYER_ID_MODIFIED',
--       NEW.id::text,
--       jsonb_build_object(
--         'old_buyer_id', OLD.buyer_id,
--         'new_buyer_id', NEW.buyer_id,
--         'order_id', NEW.id,
--         'timestamp', NOW()
--       )
--     );
--     RAISE WARNING 'SECURITY: buyer_id was modified on order %', NEW.id;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- CREATE TRIGGER log_buyer_id_changes
--   BEFORE UPDATE ON public.orders
--   FOR EACH ROW
--   EXECUTE FUNCTION audit_buyer_id_change();
-- ====================================================================

-- ====================================================================
-- VERIFICATION:
-- ====================================================================
-- Test as checkin_operator:
--   UPDATE orders SET buyer_id = '<attacker_id>' WHERE id = '<victim_order>';
--   Expected: Permission denied
--
-- Test as buyer:
--   SELECT * FROM orders WHERE id = '<my_order>';
--   Expected: Success (own order only)
--
-- Test as admin:
--   SELECT * FROM orders WHERE tenant_id = '<tenant>';
--   Expected: Success (all orders)
-- ====================================================================