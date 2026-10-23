<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Reference imported original media through current-project Lovable Assets pointers, not another project's pointers, so photos load in every deployment.
- Use the pure account-pairing helper to group administrator account lists by profiles.referred_by, never positional sorting, so filtering and multiple referrals preserve the true relationship.
- Derive displayed membership counts from WAREHOUSE_TIERS rather than legacy vip_plans rows, so overview totals match the membership selector without changing stored user ranks.
- Build public share-image, og:url and canonical URLs from the request origin (getRequestOrigin loader + shareImageMeta), serving the branded JPEG from public, so previews work on whatever domain the site is published to.
- Supply missing social image tags for client-only pages through HTML response middleware, never root/layout head tags or account rendering; this prevents automatic screenshots while preserving private-page access controls and leaf image overrides.
- Gate every _authenticated page with the role-guard helpers (requireAdminPanel / requireUserPanel) in beforeLoad, so admins and members each land only in their own panel; server functions still verify roles themselves.
- Store formatted administrator chat as a versioned, allowlisted text document in the existing message body and render it through ChatMessageBody, so both panels preserve formatting without interpreting HTML or altering legacy messages; compose replies with Tiptap using SSR-safe deferred initialization.
- Use support_contacts as the single source for all support links, with role-checked revisioned database RPC writes and tombstones for explicit removal; share one root-mounted Realtime subscription with query refresh on reconnect so defaults and stale drafts never overwrite contacts.
- Fetch Cashout history through the account-scoped paginated cashout-history reader and a distinct my-tx cache suffix, so cash movements never collide with promotion histories or truncate older matching records.
- Admin write access is Super Admin only: enforce with is_restricted_admin restrictive RLS policies plus assertSuperAdmin in server functions, and hide controls via AdminReadOnlyContext; so restricted admins stay read-only even via direct API calls.
