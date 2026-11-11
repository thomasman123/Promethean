# Observed production security baseline: 2026-11-11

This document records applied state and release constraints. It is **not an executable migration**, and does not claim the historical migration chain was applied.

## Source and serving identity

Canonical sanitized main baseline: `36e3e29dd5b8c0ecb79fab6a33cb2a992c3c0937`. Compared with the original serving `3da76b787c44e326c8eee99b1b8ebce025e5c3af`, the only tree change was removal of the exposed credential configuration. Do not merge old unsanitized clones or rewrite the sanitized history.

This project serves `www.getpromethean.com`, `getpromethean.com` and `promethean-three.vercel.app`. At release inspection, `app.getpromethean.com` belonged to a separate 7FS deployment/project, not this source tree. Its alias must not be reclaimed by the old `vercel.json` declaration. Custom-domain DNS was unresolved from the release host; the independently verified Vercel hostname remains the tested HTTP surface. Repairing DNS requires separate current DNS ownership/context, not an alias takeover.

## Applied database state

Production project `encqrassymusdmwduhzi` has RLS on the previously exposed tables, invoker views instead of exposed definer views, reviewed function caller/tenant guards and search paths, profile self-escalation protection, and service-only arbitrary-SQL metrics functions. The HTTP admin metrics endpoint uses the typed `update_meaningful_conversations(p_account_id uuid, p_min_duration_seconds integer)` RPC with the authenticated caller. The database enforces administrator identity; the app must never substitute a service role or build raw SQL from request fields.

Private authoritative evidence is retained under the owner's `promethean-supabase-security-20261111/remediation/release-evidence-manifest.json`. It references twelve individually applied SQL stages, independent readbacks and dependency-aware rollback files. No historical SQL chain was replayed, no schema reset occurred and no migration-history rows were inserted to imply execution. Production history remained 166 at that inspection; the preview had no successful application migrations.

**Acceptance remains open:** independent review found an additional canvas UPDATE destination-policy gap and incomplete identity/backfill cross-tenant coverage. Those scoped database repairs belong to the parent's dedicated database worker. This source release does not claim them fixed. Consume that worker's exact reviewed forward-only artifact and independent acceptance receipts before marking schema alignment complete. PostgreSQL patching also requires the owner's maintenance window. Do not suppress the remaining definer warnings as a substitute for caller/tenant proof.

## Safe future release procedure

1. Keep the Supabase GitHub integration disconnected. Do not reconnect merely because an app build passes. GitHub Actions/webhooks and Vercel hooks must be inventoried before source publication.
2. Do not run `supabase db push`, reset, migration-history repair, or the historical `supabase/migrations` directory against production. Existing ordering/dependency drift is unresolved.
3. Record the actual live catalog baseline and predecessor hashes. Review a new forward-only delta against it, with explicit preconditions, transaction rollback, grants and caller/tenant tests. Never replay an already-applied security patch to align a history table.
4. Publish source without unintended build/migration triggers; a SHA-specific temporary Vercel ignore command can skip only the published security SHA while preserving unrelated release work. Read back the setting, exact remote head and terminal canceled build, then restore the previous setting.
5. Independently stage and inspect the intentional application deployment; preserve unrelated alias bindings, promote the exact READY deployment, then verify live authenticated read-only/no-op paths and unauthorized denial. Never send notifications, create customer leads/payments, or update customer metrics as a regression test.

Production build success is not a complete typecheck: the inherited Next configuration skips broad lint/type errors. Route-focused tests and real HTTP behavior are separate evidence. The provider rejected the inherited Next 15.4.6 runtime; this release upgrades to 15.5.29 rather than bypassing that security gate.
