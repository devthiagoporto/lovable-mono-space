-- ====================================================================
-- SECURITY FIX: Protect Ticket Holder Identity Documents (CPF + Names)
-- ====================================================================
-- 
-- CRITICAL ISSUES FIXED:
-- 1. CPF-based access vulnerability (users with same CPF see each other's data)
-- 2. General staff can query all customer CPF numbers
-- 3. Buyer sees CPF of all attendees in order (privacy concern)
--
-- SOLUTION:
-- - Remove CPF-based matching (flawed when multiple users have same CPF)
-- - Remove general staff access (has_tenant_access)
-- - Keep buyer access to their orders (business requirement)
-- - Add explicit transfer-based access
-- - Create separate admin-only policy for ticket management
-- ====================================================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "users_can_view_own_tickets" ON public.tickets;

-- Policy 1: Users can view tickets from orders they purchased
-- NOTE: This allows buyers to see cpf_titular of all attendees in their order.
-- This is a business requirement (buyers need to see tickets they purchased),
-- but organizers should inform buyers about this data access in ToS.
CREATE POLICY "buyers_view_order_tickets" ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = tickets.order_id 
      AND orders.buyer_id = auth.uid()
  )
);

-- Policy 2: Users can view tickets that have been transferred to them
-- Covers both pending transfers (to review before accepting) and accepted ones
CREATE POLICY "users_view_transferred_tickets" ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transfers
    WHERE transfers.ticket_id = tickets.id
      AND transfers.to_user_id = auth.uid()
      AND transfers.status IN ('pendente', 'aceito')
  )
);

-- Policy 3: Users can view tickets they transferred away (to track transfer status)
CREATE POLICY "users_view_tickets_they_transferred" ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transfers
    WHERE transfers.ticket_id = tickets.id
      AND transfers.from_user_id = auth.uid()
  )
);

-- Policy 4: Only tenant admins can view/manage all tickets
-- This replaces the overly broad has_tenant_access() condition
CREATE POLICY "admins_manage_tenant_tickets" ON public.tickets
FOR ALL
TO authenticated
USING (is_tenant_admin(tenant_id))
WITH CHECK (is_tenant_admin(tenant_id));

-- ====================================================================
-- IMPORTANT NOTES:
-- ====================================================================
-- ✅ Removed CPF-based access (was vulnerable to cross-user data leaks)
-- ✅ Removed general staff access (checkin operators can no longer browse CPFs)
-- ✅ Buyers can still see tickets they purchased (business requirement)
-- ✅ Transfer system now properly integrated into RLS
-- ✅ Only admins (not all staff) can manage tickets
--
-- REMAINING PRIVACY CONCERN:
-- Buyers can still see cpf_titular of tickets they purchased for others.
-- This is necessary for ticket management but should be disclosed in:
-- - Terms of Service
-- - Privacy Policy
-- - Purchase confirmation screen
-- 
-- ALTERNATIVE (if full privacy is required):
-- Remove the buyers_view_order_tickets policy and require all ticket
-- distribution to go through the transfer system. This would prevent
-- buyers from seeing other attendees' CPF but requires more complex UX.
-- ====================================================================