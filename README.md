# Voting Project (Clarity 3)

Election management with registration, voting commitments, tallying, and completion phases.

This contract implements a complete commit–reveal election workflow with:
- Election creation and admin ownership
- Candidate registration with uniqueness by name
- Voter registration
- Commit-phase voting using SHA-256 commitments
- Reveal-phase tallying and winner selection
- Strict phase and deadline gating based on stacks-block-height

Contract file: contracts/voting-project.clar

Version: 1.0.0

License: ISC

## Phases

- PHASE-REGISTER (u0): Admin configures candidates, voters register.
- PHASE-VOTING (u1): Registered voters cast commitments.
- PHASE-TALLY (u2): Votes are revealed and tallied.
- PHASE-COMPLETED (u3): Election finalized; admin can start another election.

Transitions are gated by deadlines compared to stacks-block-height:
- start-voting-phase requires stacks-block-height >= reg-deadline
- start-tally-phase requires stacks-block-height >= voting-deadline
- complete-election requires stacks-block-height >= tally-deadline

## Error Codes

- E_ALREADY_HAS_ACTIVE u1001: Admin already owns an active election.
- E_ELECTION_NOT_FOUND u1002: Unknown election ID.
- E_NOT_ADMIN u1003: Caller is not the election admin.
- E_INVALID_PHASE u1004: Action not allowed in current phase.
- E_REGISTRATION_CLOSED u1005: Registration closed.
- E_DUPLICATE_REGISTRATION u1006: Voter already registered.
- E_NOT_REGISTERED u1007: Caller not registered.
- E_DUPLICATE_VOTE u1008: Voter already cast a vote.
- E_CANDIDATE_NOT_FOUND u1009: Unknown candidate ID.
- E_VOTING_NOT_OPEN u1010: Voting phase not open.
- E_TALLY_NOT_OPEN u1011: Tally phase not open.
- E_DEADLINE_NOT_REACHED u1012: Required deadline not reached.
- E_ALREADY_REVEALED u1013: Vote already revealed by caller.
- E_COMPLETED u1014: Election already completed.
- E_DUPLICATE_CANDIDATE u1015: Candidate name already exists.
- E_NO_WINNER u1016: No winner yet.
- E_HASH_MISMATCH u1017: Reveal hash mismatch.

## Data Model

- Vars
  - next-election-id: auto-increment election ID (starts at u1)
  - active-elections: list of active election IDs
- Maps
  - elections {id} -> {admin, name, description, phase, reg-deadline, voting-deadline, tally-deadline}
  - admin-active {admin} -> {election-id}
  - voters {election-id, voter} -> {registered, voted}
  - commitments {election-id, voter} -> {vote-hash, revealed}
  - candidates {election-id, candidate-id} -> {name, description, key, votes}
  - candidate-name-exists {election-id, name} -> {exists}
  - candidate-next-id {election-id} -> {next-id}
  - candidate-id-list {election-id} -> {ids}
  - voter-counts {election-id} -> {count}
  - winners {election-id} -> {candidate-id, votes}

## Public Functions

- create-election(name, description, reg-deadline, voting-deadline, tally-deadline) -> (ok election-id) or (err ...)
  - Preconditions: caller must not have an active election; deadlines must be strictly increasing (reg < voting < tally).
- add-candidate(election-id, candidate-name, candidate-description, candidate-key) -> (ok candidate-id) or (err ...)
  - Preconditions: caller must be admin; phase must be REGISTER; name unique within election; candidate-key is (buff 32).
- start-voting-phase(election-id) -> (ok true) or (err ...)
  - Preconditions: admin only; phase REGISTER; stacks-block-height >= reg-deadline.
- start-tally-phase(election-id) -> (ok true) or (err ...)
  - Preconditions: admin only; phase VOTING; stacks-block-height >= voting-deadline.
- complete-election(election-id) -> (ok true) or (err ...)
  - Preconditions: admin only; phase TALLY; stacks-block-height >= tally-deadline.
- register-voter(election-id) -> (ok true) or (err ...)
  - Preconditions: phase REGISTER; voter not yet registered; sets {registered: true, voted: false}.
- cast-vote(election-id, candidate-id, vote-hash) -> (ok true) or (err ...)
  - Preconditions: phase VOTING; candidate must exist; caller registered; not yet voted; stores commitment.
- reveal-vote(election-id, candidate-id, salt) -> (ok true) or (err ...)
  - Preconditions: phase TALLY; caller must have committed and not revealed; verifies sha256(candidate-key ++ salt) == stored vote-hash; then increments votes, marks revealed, updates winner.

## Read-Only Functions

- get-election-details(election-id) -> (ok tuple)
- is-registered(election-id, voter) -> bool
- has-voted(election-id, voter) -> bool
- get-candidate-votes(election-id, candidate-id) -> (ok votes) or (err ...)
- get-election-winner(election-id) -> (ok candidate-id) or (err E_NO_WINNER)
- get-all-candidates(election-id) -> (ok (list ...))
- get-candidate(election-id, candidate-id) -> (ok {id, name, description, votes}) or (err ...)
- get-all-active-elections() -> (list ...)
- get-election-by-admin(admin) -> (ok election-id) or (err E_ELECTION_NOT_FOUND)

## Commitment Scheme

- vote-hash is sha256(candidate-key ++ salt).
- candidate-key is stored per candidate as (buff 32) and must be 32 bytes.
- salt must be provided by voter at reveal time as (buff 32).
- To generate 32-byte buffers in JS, you can use Node's crypto sha256 of any string:

```ts
import { createHash } from 'crypto';
const to32 = (input: string) => new Uint8Array(createHash('sha256').update(input).digest());
```

## Typical Workflow

1. Admin calls create-election(name, description, reg, voting, tally).
2. Admin adds one or more candidates using add-candidate(eid, name, description, candidate-key).
3. Voters register using register-voter(eid).
4. Advance chain to reg-deadline; admin calls start-voting-phase(eid).
5. Registered voters compute vote-hash and cast-vote(eid, candidate-id, vote-hash).
6. Advance chain to voting-deadline; admin calls start-tally-phase(eid).
7. Voters reveal using reveal-vote(eid, candidate-id, salt).
8. Optionally query get-candidate-votes(eid, cid) and get-election-winner(eid).
9. Advance chain to tally-deadline; admin completes with complete-election(eid).

## Simnet / Testing

This repo is configured with Vitest and vitest-environment-clarinet:
- simnet is provided globally by the test environment; do not import it manually.
- See tests/voting-project.test.ts for end-to-end workflow.

Run tests:

```bash
npm run test
```

Collect coverage and costs (see package.json):

```bash
npm run test:report
```

Advance block height in simnet to satisfy deadlines:

```ts
// mine to reach reg-deadline, voting-deadline, tally-deadline thresholds
simnet.mineEmptyBlocks(100);
```

## Notes and Constraints

- One active election per admin enforced via admin-active.
- Candidate names must be unique per election.
- Election completion clears admin-active and keeps an active-elections log list.
- Deadlines are compared to stacks-block-height; in tests, mineEmptyBlocks is used to progress time.
- Read-only getters return ok/err patterns consistent with Clarity idioms.

## File Structure

- contracts/voting-project.clar — Contract source.
- tests/voting-project.test.ts — Vitest suite covering flows and edge-cases.
- vitest.config.js — Clarinet/Vitest integration.
- Clarinet.toml — Clarinet manifest.

## Deployment

For on-chain deployment, use Clarinet or Hiro tools to publish the contract and call the admin functions under the desired principal. Ensure deadlines (as uints) reflect appropriate future block heights on the target network.

## License

ISC