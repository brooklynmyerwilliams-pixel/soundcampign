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
- Gate every _authenticated page with the role-guard helpers (requireAdminPanel / requireUserPanel) in beforeLoad, so admins and members each land only in their own panel; server functions still verify roles themselves.
- Validate registration invitations through the boolean-only is_registration_invite_valid RPC using the same browser client as signup; this avoids environment mismatches and never exposes profile rows.
