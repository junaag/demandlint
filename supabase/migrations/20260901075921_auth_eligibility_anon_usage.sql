-- The public eligibility RPC is intentionally callable before authentication. Its security-invoker
-- wrapper delegates to private.email_eligibility(), so anon needs schema resolution in addition to
-- the narrowly granted EXECUTE privilege on that function. No private table privileges are granted.
grant usage on schema private to anon;
