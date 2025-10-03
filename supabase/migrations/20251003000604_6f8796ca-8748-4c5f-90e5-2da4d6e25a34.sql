-- ====================================================================
-- SECURITY FIX: Remove public access to coupons table
-- ====================================================================
-- 
-- ISSUE: Competitors could scrape pricing strategy and promotional codes
-- 
-- SOLUTION: Drop the public SELECT policy. Coupon validation will continue
-- to work through the cart-validate Edge Function (uses service role).
-- Only authenticated tenant members can view/manage coupons.
--
-- IMPACT: 
-- ✅ Prevents coupon enumeration attacks
-- ✅ Protects business intelligence (discount strategies, limits)
-- ✅ Does NOT break cart-validate (uses service role access)
-- ✅ Maintains tenant member access for coupon management
-- ====================================================================

-- Drop the public access policy
DROP POLICY IF EXISTS "public_can_view_active_coupons" ON public.coupons;

-- Verify remaining policies are secure:
-- ✅ tenant_members_can_manage_coupons: Only authenticated tenant members
--    can view/manage coupons for their events

-- Note: The cart-validate Edge Function uses SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS, so coupon validation continues to work securely.