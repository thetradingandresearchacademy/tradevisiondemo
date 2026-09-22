TradeVision AUTH-03 staging build

Purpose: test authorization changes in a separate GitHub/Vercel staging project before production.

Changes are limited to authorization/access plumbing and admin frontend entitlements:
- NEW api/_authorize.js
- api/check_access.js
- api/save_session.js
- api/projection_v8.js
- api/search_symbols.js
- ui-modules/auth.module.js
- index.html
- ui-core.js

No simulation/trading/projection mathematics were edited.

IMPORTANT: This frontend expects the already-updated Supabase subscriptions table with is_approved and the deployed simulate approval gate.

Staging Vercel environment must contain the same required server-only variables used by the existing app, especially SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never place the service role key in browser code.
