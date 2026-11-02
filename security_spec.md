# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Verified Authentication Gate**: Every write operation (`create`, `update`, `delete`) requires `request.auth != null && request.auth.token.email_verified == true`.
2. **Master Gate Relational Ownership**: All subcollections (`moments`, `growth_records`, `milestones`, `parenting_quotes`) under `/journals/{journalId}` require that the parent `/journals/{journalId}` exists and the caller's `request.auth.uid` matches either `ownerId` or non-empty `partnerUid` on the parent journal (`isJournalMember(journalId)`).
3. **Zero-Lookup Secure List Queries**: Every `allow list` block enforces ownership strictly against `resource.data` (`existing().ownerId == request.auth.uid || (existing().partnerUid != '' && existing().partnerUid == request.auth.uid)`) with zero `get()` or `exists()` calls to prevent O(n) read cost amplification.
4. **Strict Key & Size Enforcement**: Every entity validation helper (`isValidFamilyJournal`, `isValidMomentEntry`, `isValidGrowthEntry`, `isValidMilestoneEntry`, `isValidParentingQuoteEntry`) enforces `hasAll` + `hasOnly` on `create`, wraps the entire `update` block alongside action-based `affectedKeys().hasOnly(...)`, validates IDs via `isValidId()`, and enforces explicit `.size()` bounds on every string field (Firebase Storage URLs capped at `<= 2048` characters; quote text capped at `<= 600` characters).
5. **Temporal & Identity Immutability**: `ownerId`, `journalId`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must strictly equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads (All Return `PERMISSION_DENIED`)
1. **Unverified Email Spoof**: Authenticated token with `email_verified: false` attempting `create` on `/journals/journal_salma`.
2. **Owner Spoofing on Create**: `create` `/journals/journal_salma` with `ownerId: "victim_uid"` while `request.auth.uid == "attacker_uid"`.
3. **Shadow Field Injection on Create**: `create` `/journals/journal_salma` containing undeclared key `"isAdmin": true`.
4. **Shadow Field Injection on Update**: `update` `/journals/journal_salma` adding `"role": "super"` alongside `"name"`.
5. **Owner Takeover on Update**: Bound `partnerUid` attempting to overwrite `ownerId` on `/journals/journal_salma`.
6. **Partner Hijack When Already Bound**: Third user attempting `Action 2` partner binding when `existing().partnerUid` is already non-empty.
7. **ID Poisoning**: Creating `/journals/{1500_char_id}` or path IDs with special characters outside `^[a-zA-Z0-9_\-]+$`.
8. **Value Poisoning / Megabyte Base64 String**: Updating `avatarUrl` or `mediaUrl` with a 500KB raw base64 string (`> 2048` limit) instead of a Firebase Storage URL.
9. **Client Timestamp Forgery**: Setting `createdAt` or `updatedAt` to a client-chosen timestamp instead of `request.time`.
10. **Orphaned Subcollection Write**: Creating `/journals/nonexistent/parenting_quotes/q1` or `/moments/m1` when parent journal document does not exist.
11. **Blanket List Scraping**: Authenticated non-member issuing an unfiltered `list` query on `/journals/j1/moments` or `/journals/j1/parenting_quotes`.
12. **Author Spoofing in Subcollections**: Co-parent writing a moment, milestone, growth record, or parenting quote with `authorUid` set to another user's UID.

## 3. Red Team Conflict Audit Across All Collections
- `/journals/{journalId}`:
  - Identity Spoofing: Blocked (`incoming().ownerId == request.auth.uid` on create; `incoming().ownerId == existing().ownerId` on update).
  - Resource/Value Poisoning: Blocked (`isValidId(journalId)` + `isValidFamilyJournal(incoming())` wrapping both create and update).
  - Blanket Reads: Blocked (`allow list: if false;`, `allow get` restricted to `ownerId` or `partnerUid`).
- `/journals/{journalId}/moments/{momentId}`:
  - Master Gate: Enforced via `isJournalMember(journalId)`.
  - Query Trust: Passed (`allow list` checks `existing().ownerId` / `existing().partnerUid` directly without `get()`).
  - Value Poisoning: Blocked (`isValidMomentEntry(incoming(), journalId)` wraps update + `mediaUrl.size() <= 2048`).
- `/journals/{journalId}/growth_records/{recordId}`:
  - Master Gate & Query Trust: Passed.
  - Value Poisoning: Blocked (`isValidGrowthEntry(incoming(), journalId)` wraps create and update).
- `/journals/{journalId}/milestones/{milestoneId}`:
  - Master Gate & Query Trust: Passed.
  - Value Poisoning: Blocked (`isValidMilestoneEntry(incoming(), journalId)` wraps create and update).
- `/journals/{journalId}/parenting_quotes/{quoteId}`:
  - Master Gate & Query Trust: Passed.
  - Value Poisoning: Blocked (`isValidParentingQuoteEntry(incoming(), journalId)` wraps create and update, `text.size() <= 600`, `orderIndex >= 0 && orderIndex <= 50`).
