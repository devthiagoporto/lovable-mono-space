-- ============================================================
-- CORREÇÃO: Remover view current_user_memberships de forma correta
-- ============================================================

-- 1. Dropar política que depende da view
DROP POLICY IF EXISTS "users_can_view_their_tenants" ON tenants;

-- 2. Dropar view
DROP VIEW IF EXISTS current_user_memberships;

-- 3. Recriar política sem usar a view
CREATE POLICY "users_can_view_their_tenants" ON tenants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = tenants.id
  )
);