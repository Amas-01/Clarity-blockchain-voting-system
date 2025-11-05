;; title: voting-project
;; version: 1.0.0
;; summary: Election management with registration, voting commitments, tallying, and completion phases
;; description: Clarity 3 smart contract implementing elections, candidates, voters, and vote reveal via salted commitments.

;; File overview
;; This contract manages on-chain elections with four phases:
;;   1) Registration (PHASE-REGISTER): Admin creates an election, adds candidates, and voters register.
;;   2) Voting (PHASE-VOTING): Registered voters commit to a vote by submitting a hash of (candidate-key ++ salt).
;;   3) Tally (PHASE-TALLY): Voters reveal their vote by presenting the candidate-id and the original salt; the contract
;;      verifies the hash and increments the candidate's vote count.
;;   4) Completed (PHASE-COMPLETED): Admin finalizes the election after the tally window closes.
;;
;; Key design aspects:
;; - Each election is owned by a specific admin principal (tx-sender who created it).
;; - Admins can only have one "active" (non-completed) election at a time.
;; - Candidate uniqueness by name is enforced per election via a dedicated index map.
;; - Vote secrecy is preserved during the voting phase by storing only the hash commitments.
;; - Integrity at tally time is enforced by recomputing the hash with the stored candidate-key and provided salt.
;; - A running "winner" record is maintained for convenience during tallying.

;; Security/consistency invariants:
;; - Phase transitions are strictly enforced and time-locked to the configured deadlines.
;; - Only the election admin can transition phases.
;; - Only registered voters can cast a vote, and only once.
;; - Tally requires a correct reveal (hash match) to count the vote.
;; - Once revealed, a voter cannot reveal again.
;; - Election finalization clears the admin-active pointer for that admin.
;;
;; Error codes are defined as constants to make reverts explicit and re-usable across functions.
;; Read-only functions provide convenient accessors for UI and indexing off-chain.



;; ============================
;; Constants
;; ============================
;; Election lifecycle phases. These constants represents valid actions in each function.
(define-constant PHASE-REGISTER u0)   ;; Election is accepting voter registrations and candidate additions
(define-constant PHASE-VOTING u1)     ;; Registered voters submit hashed commitments
(define-constant PHASE-TALLY u2)      ;; Voters reveal votes; counts are updated
(define-constant PHASE-COMPLETED u3)  ;; Terminal state; no further modifications allowed

;; Error codes
;; These are returned via (err ...) to signal specific failure conditions to callers.
(define-constant E_ALREADY_HAS_ACTIVE u1001)       ;; Admin already has an active (non-completed) election
(define-constant E_ELECTION_NOT_FOUND u1002)       ;; Referenced election id does not exist
(define-constant E_NOT_ADMIN u1003)                ;; Caller is not the admin of the election
(define-constant E_INVALID_PHASE u1004)            ;; Operation not allowed in current phase
(define-constant E_REGISTRATION_CLOSED u1005)      ;; Registration attempt outside registration phase
(define-constant E_DUPLICATE_REGISTRATION u1006)   ;; Voter cannot register twice
(define-constant E_NOT_REGISTERED u1007)           ;; Operation requires a registered voter
(define-constant E_DUPLICATE_VOTE u1008)           ;; Voter cannot cast vote twice
(define-constant E_CANDIDATE_NOT_FOUND u1009)      ;; Referenced candidate does not exist
(define-constant E_VOTING_NOT_OPEN u1010)          ;; Voting attempt outside voting phase
(define-constant E_TALLY_NOT_OPEN u1011)           ;; Tally/reveal attempt outside tally phase
(define-constant E_DEADLINE_NOT_REACHED u1012)     ;; Phase transition attempted before deadline
(define-constant E_ALREADY_REVEALED u1013)         ;; Vote already revealed for this voter
(define-constant E_COMPLETED u1014)                ;; Operation attempted on a completed election
(define-constant E_DUPLICATE_CANDIDATE u1015)      ;; Candidate name duplicate prevented within an election
(define-constant E_NO_WINNER u1016)                ;; Winner query before any tallied vote exists
(define-constant E_HASH_MISMATCH u1017)            ;; Reveal failed: computed hash != committed hash


;; ============================
;; Data Vars
;; ============================
;; Auto-incremented election id. Starts at u1 and increments upon creation.
(define-data-var next-election-id uint u1)

;; In-memory index of active election ids (bounded to 1000). Used by UIs to discover current elections.
(define-data-var active-elections (list 1000 uint) (list))


;; ============================
;; Data Maps
;; ============================

;; Elections metadata
;; Key: { id }
;; Value:
;;   - admin: creator/owner principal
;;   - name, description: human-readable metadata
;;   - phase: current lifecycle phase (one of PHASE-*)
;;   - reg-deadline: block height after which registration can close/transition
;;   - voting-deadline: block height for opening tally phase
;;   - tally-deadline: block height for completion
(define-map elections
  { id: uint }
  {
    admin: principal,
    name: (string-ascii 64),
    description: (string-ascii 256),
    phase: uint,
    reg-deadline: uint,
    voting-deadline: uint,
    tally-deadline: uint
  }
)

;; Active election id pointer per admin.
;; Ensures one active election per admin at a time.
(define-map admin-active
  { admin: principal }
  { election-id: uint }
)

;; Voter registration record for a given election.
;; - registered: flag that the voter enrolled during registration phase
;; - voted: flag that the voter has cast a commitment during voting phase
(define-map voters
  { election-id: uint, voter: principal }
  { registered: bool, voted: bool }
)

;; Vote commitment storage for a given election and voter.
;; vote-hash must be the sha256 of (candidate-key ++ salt), 32-byte digest.
;; revealed indicates whether the commitment has been revealed and tallied.
(define-map commitments
  { election-id: uint, voter: principal }
  { vote-hash: (buff 32), revealed: bool }
)

;; Candidate storage scoped by election.
;; - key is a 32-byte secret per candidate used in commitment hashing
;; - votes is the running total, updated only during tally/reveal
(define-map candidates
  { election-id: uint, candidate-id: uint }
  { name: (string-ascii 64), description: (string-ascii 256), key: (buff 32), votes: uint }
)

;; Candidate name uniqueness index per election.
;; Prevents duplicate candidate names by marking existence.
(define-map candidate-name-exists
  { election-id: uint, name: (string-ascii 64) }
  { exists: bool }
)

;; Next candidate id per election (auto-increment).
(define-map candidate-next-id
  { election-id: uint }
  { next-id: uint }
)

;; Candidate id enumeration per election for discovery/listing.
;; Bounded to 200 candidates to fit memory constraints.
(define-map candidate-id-list
  { election-id: uint }
  { ids: (list 200 uint) }
)

;; Registered voter count per election (auxiliary metric; not used for enforcement).
(define-map voter-counts
  { election-id: uint }
  { count: uint }
)

;; Tracks the current winner during tally phase.
;; Updated incrementally on each successful reveal to avoid O(N) passes after tally.
(define-map winners
  { election-id: uint }
  { candidate-id: uint, votes: uint }
)


;; ============================
;; Private Helper Functions
;; ============================

;; ensure-admin(election-id) -> (ok true) or (err ...)
;; Validates that tx-sender is the admin of the specified election.
;; Errors:
;; - E_ELECTION_NOT_FOUND if election doesn't exist
;; - E_NOT_ADMIN if caller is not election admin
(define-private (ensure-admin (election-id uint))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get admin election) tx-sender)
          (ok true)
          (err E_NOT_ADMIN))
    (err E_ELECTION_NOT_FOUND))
)

;; is-completed(election-id) -> bool to test if the election was finalised
(define-private (is-completed (election-id uint))
  (match (map-get? elections { id: election-id })
    election (is-eq (get phase election) PHASE-COMPLETED)
    false)
)

;; append-id(ids, id) -> (list 200 uint)
;; Safe append to a bounded list of uint up to length 200.
(define-private (append-id (ids (list 200 uint)) (id uint))
  (match (as-max-len? (append ids id) u200)
    new-ids new-ids
    ids)
)

;; remove-election-from-active(election-id)
;; Placeholder for removing an election-id from the active-elections var.
(define-private (remove-election-from-active (election-id uint))
  (var-set active-elections (var-get active-elections))
)


;; ============================
;; Public Functions (Admin/Election Management)
;; ============================

;; create-election(name, description, reg-deadline, voting-deadline, tally-deadline) -> (ok eid) | (err ...)
;; Creates a new election for tx-sender. Enforces:
;; - Only one active election per admin (E_ALREADY_HAS_ACTIVE).
;; - Deadlines must be strictly increasing: reg < voting < tally (else E_DEADLINE_NOT_REACHED).
;; Emits:
;; - print event "election-created".
(define-public (create-election (name (string-ascii 64)) (description (string-ascii 256)) (reg-deadline uint) (voting-deadline uint) (tally-deadline uint))
  (if (is-some (map-get? admin-active { admin: tx-sender }))
      (err E_ALREADY_HAS_ACTIVE)
      (if (and (< reg-deadline voting-deadline) (< voting-deadline tally-deadline))
          (let ((eid (var-get next-election-id)))
            ;; allocate id and persist metadata in REGISTER phase
            (var-set next-election-id (+ eid u1))
            (map-set elections { id: eid }
              {
                admin: tx-sender,
                name: name,
                description: description,
                phase: PHASE-REGISTER,
                reg-deadline: reg-deadline,
                voting-deadline: voting-deadline,
                tally-deadline: tally-deadline
              })
            ;; mark this admin as having an active election
            (map-set admin-active { admin: tx-sender } { election-id: eid })
            (match (as-max-len? (append (var-get active-elections) eid) u1000)
              new-list (var-set active-elections new-list)
              (var-set active-elections (var-get active-elections)))
            ;; initialize per-election counters/indices
            (map-set candidate-next-id { election-id: eid } { next-id: u1 })
            (map-set candidate-id-list { election-id: eid } { ids: (list) })
            (map-set voter-counts { election-id: eid } { count: u0 })
            (print { event: "election-created", election-id: eid, admin: tx-sender, name: name })
            (ok eid))
          (err E_DEADLINE_NOT_REACHED)))
)

;; add-candidate(election-id, candidate-name, candidate-description, candidate-key) -> (ok candidate-id) | (err ...)
;; Admin-only, allowed only in REGISTER phase.
;; - candidate-key is a 32-byte secret used to validate vote commitments during tally.
;; - candidate-name must be unique per election (E_DUPLICATE_CANDIDATE).
;; Errors: E_COMPLETED, E_ELECTION_NOT_FOUND, E_NOT_ADMIN, E_INVALID_PHASE
(define-public (add-candidate (election-id uint) (candidate-name (string-ascii 64)) (candidate-description (string-ascii 256)) (candidate-key (buff 32)))
  (if (is-completed election-id)
      (err E_COMPLETED)
      (match (map-get? elections { id: election-id })
        election
          (if (is-eq (get admin election) tx-sender)
              (if (is-eq (get phase election) PHASE-REGISTER)
                  (if (is-some (map-get? candidate-name-exists { election-id: election-id, name: candidate-name }))
                      (err E_DUPLICATE_CANDIDATE)
                      (let
                        (
                          (nid (match (map-get? candidate-next-id { election-id: election-id })
                                      r (get next-id r)
                                      u1))
                          (ids (match (map-get? candidate-id-list { election-id: election-id })
                                      r (get ids r)
                                      (list)))
                          (new-ids (append-id ids nid))
                        )
                        ;; create candidate with vote count initialized to 0
                        (map-set candidates { election-id: election-id, candidate-id: nid }
                          { name: candidate-name, description: candidate-description, key: candidate-key, votes: u0 })
                        ;; mark name as used, bump next-id, and record id in enumeration list
                        (map-set candidate-name-exists { election-id: election-id, name: candidate-name } { exists: true })
                        (map-set candidate-next-id { election-id: election-id } { next-id: (+ nid u1) })
                        (map-set candidate-id-list { election-id: election-id } { ids: new-ids })
                        (print { event: "candidate-added", election-id: election-id, candidate-id: nid, name: candidate-name })
                        (ok nid)))
                  (err E_INVALID_PHASE))
              (err E_NOT_ADMIN))
        (err E_ELECTION_NOT_FOUND)))
)

;; start-voting-phase(election-id) -> (ok true) | (err ...)
;; Admin-only transition from REGISTER -> VOTING.
;; Allowed only if current block height >= reg-deadline.
;; Errors: E_ELECTION_NOT_FOUND, E_NOT_ADMIN, E_INVALID_PHASE, E_DEADLINE_NOT_REACHED
(define-public (start-voting-phase (election-id uint))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get admin election) tx-sender)
          (if (is-eq (get phase election) PHASE-REGISTER)
              (if (>= stacks-block-height (get reg-deadline election))
                  (begin
                    ;; persist phase change while retaining metadata
                    (map-set elections { id: election-id }
                      {
                        admin: (get admin election),
                        name: (get name election),
                        description: (get description election),
                        phase: PHASE-VOTING,
                        reg-deadline: (get reg-deadline election),
                        voting-deadline: (get voting-deadline election),
                        tally-deadline: (get tally-deadline election)
                      })
                    (print { event: "phase-transitioned", election-id: election-id, from: "register", to: "voting" })
                    (ok true)
                  )
                  (err E_DEADLINE_NOT_REACHED))
              (err E_INVALID_PHASE))
          (err E_NOT_ADMIN))
    (err E_ELECTION_NOT_FOUND))
)

;; start-tally-phase(election-id) -> (ok true) | (err ...)
;; Admin-only transition from VOTING -> TALLY.
;; Allowed only if current block height >= voting-deadline.
;; Errors: E_ELECTION_NOT_FOUND, E_NOT_ADMIN, E_INVALID_PHASE, E_DEADLINE_NOT_REACHED
(define-public (start-tally-phase (election-id uint))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get admin election) tx-sender)
          (if (is-eq (get phase election) PHASE-VOTING)
              (if (>= stacks-block-height (get voting-deadline election))
                  (begin
                    (map-set elections { id: election-id }
                      {
                        admin: (get admin election),
                        name: (get name election),
                        description: (get description election),
                        phase: PHASE-TALLY,
                        reg-deadline: (get reg-deadline election),
                        voting-deadline: (get voting-deadline election),
                        tally-deadline: (get tally-deadline election)
                      })
                    (print { event: "phase-transitioned", election-id: election-id, from: "voting", to: "tally" })
                    (ok true)
                  )
                  (err E_DEADLINE_NOT_REACHED))
              (err E_INVALID_PHASE))
          (err E_NOT_ADMIN))
    (err E_ELECTION_NOT_FOUND))
)

;; complete-election(election-id) -> (ok true) | (err ...)
;; Admin-only transition from TALLY -> COMPLETED.
;; Allowed only if current block height >= tally-deadline.
;; After an election is completed, it deletes admin-active pointer and optionally removes from active-elections.
;; Errors: E_ELECTION_NOT_FOUND, E_NOT_ADMIN, E_INVALID_PHASE, E_DEADLINE_NOT_REACHED
(define-public (complete-election (election-id uint))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get admin election) tx-sender)
          (if (is-eq (get phase election) PHASE-TALLY)
              (if (>= stacks-block-height (get tally-deadline election))
                  (begin
                    (map-set elections { id: election-id }
                      {
                        admin: (get admin election),
                        name: (get name election),
                        description: (get description election),
                        phase: PHASE-COMPLETED,
                        reg-deadline: (get reg-deadline election),
                        voting-deadline: (get voting-deadline election),
                        tally-deadline: (get tally-deadline election)
                      })
                    (map-delete admin-active { admin: tx-sender })
                    (remove-election-from-active election-id)
                    (print { event: "phase-transitioned", election-id: election-id, from: "tally", to: "completed" })
                    (ok true)
                  )
                  (err E_DEADLINE_NOT_REACHED))
              (err E_INVALID_PHASE))
          (err E_NOT_ADMIN))
    (err E_ELECTION_NOT_FOUND))
)

;; get-election-details(election-id) -> (ok { ... }) | (err E_ELECTION_NOT_FOUND)
;; Read-only accessor for full election metadata.
(define-read-only (get-election-details (election-id uint))
  (match (map-get? elections { id: election-id })
    e (ok {
      admin: (get admin e),
      name: (get name e),
      description: (get description e),
      phase: (get phase e),
      reg-deadline: (get reg-deadline e),
      voting-deadline: (get voting-deadline e),
      tally-deadline: (get tally-deadline e)
    })
    (err E_ELECTION_NOT_FOUND))
)


;; ============================
;; Public Functions (Voter Registration)
;; ============================

;; register-voter(election-id) -> (ok true) | (err ...)
;; Allows any principal to register as a voter during REGISTER phase.
;; Errors: E_ELECTION_NOT_FOUND, E_REGISTRATION_CLOSED, E_DUPLICATE_REGISTRATION
(define-public (register-voter (election-id uint))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get phase election) PHASE-REGISTER)
          (if (is-some (map-get? voters { election-id: election-id, voter: tx-sender }))
              (err E_DUPLICATE_REGISTRATION)
              (begin
                (map-set voters { election-id: election-id, voter: tx-sender } { registered: true, voted: false })
                ;; bump registration count (best-effort)
                (let ((vc (match (map-get? voter-counts { election-id: election-id })
                                 r (get count r)
                                 u0)))
                  (map-set voter-counts { election-id: election-id } { count: (+ vc u1) })
                )
                (print { event: "voter-registered", election-id: election-id })
                (ok true)
              ))
          (err E_REGISTRATION_CLOSED))
    (err E_ELECTION_NOT_FOUND))
)

;; is-registered(election-id, voter) -> bool
;; read-only function to check for registration status.
(define-read-only (is-registered (election-id uint) (voter principal))
  (is-some (map-get? voters { election-id: election-id, voter: voter }))
)


;; ============================
;; Public Functions (Voting)
;; ============================

;; cast-vote(election-id, candidate-id, vote-hash) -> (ok true) | (err ...)
;; Submits a vote commitment during VOTING phase.
;; for this to happen:
;; - election must be in VOTING phase
;; - candidate must exist
;; - caller must be a registered voter and must not have voted previously
;; Errors: E_ELECTION_NOT_FOUND, E_VOTING_NOT_OPEN, E_CANDIDATE_NOT_FOUND, E_NOT_REGISTERED, E_DUPLICATE_VOTE
(define-public (cast-vote (election-id uint) (candidate-id uint) (vote-hash (buff 32)))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get phase election) PHASE-VOTING)
          (if (is-some (map-get? candidates { election-id: election-id, candidate-id: candidate-id }))
              (match (map-get? voters { election-id: election-id, voter: tx-sender })
                voter-info
                  (if (get registered voter-info)
                      (if (get voted voter-info)
                          (err E_DUPLICATE_VOTE)
                          (begin
                            (map-set commitments { election-id: election-id, voter: tx-sender } { vote-hash: vote-hash, revealed: false })
                            (map-set voters { election-id: election-id, voter: tx-sender } { registered: true, voted: true })
                            (print { event: "vote-cast", election-id: election-id })
                            (ok true)
                          ))
                      (err E_NOT_REGISTERED))
                (err E_NOT_REGISTERED))
              (err E_CANDIDATE_NOT_FOUND))
          (err E_VOTING_NOT_OPEN))
    (err E_ELECTION_NOT_FOUND))
)

;; has-voted(election-id, voter) -> bool
;; Returns true if voter record exists with voted=true; false otherwise.
(define-read-only (has-voted (election-id uint) (voter principal))
  (match (map-get? voters { election-id: election-id, voter: voter })
    v (get voted v)
    false)
)


;; ============================
;; Public Functions (Result Tallying & Verification)
;; ============================

;; Commitment scheme: sha256(candidate-key ++ salt)
;; - candidate-key is stored with the candidate on-chain (private by convention; not secret once deployed)
;; - salt is a user-provided 32-byte buffer, known only to the voter until reveal
;; The commitment (vote-hash) is stored during cast-vote; reveal recomputes and verifies equality.
;;
;; reveal-vote(election-id, candidate-id, salt) -> (ok true) | (err ...)
;; forthis to happen:
;; - election must be in TALLY phase
;; - caller must have a stored commitment and must not have revealed already
;; - candidate must exist
;; - sha256(candidate.key ++ salt) must equal stored commitment
;; Errors: E_ELECTION_NOT_FOUND, E_TALLY_NOT_OPEN, E_NOT_REGISTERED, E_ALREADY_REVEALED, E_CANDIDATE_NOT_FOUND, E_HASH_MISMATCH
(define-public (reveal-vote (election-id uint) (candidate-id uint) (salt (buff 32)))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get phase election) PHASE-TALLY)
          (match (map-get? commitments { election-id: election-id, voter: tx-sender })
            comm
              (if (get revealed comm)
                  (err E_ALREADY_REVEALED)
                  (match (map-get? candidates { election-id: election-id, candidate-id: candidate-id })
                    cand
                      (let
                        (
                          (computed (sha256 (concat (get key cand) salt)))
                        )
                        (if (is-eq computed (get vote-hash comm))
                            (begin
                              ;; increment candidate votes
                              (map-set candidates { election-id: election-id, candidate-id: candidate-id }
                                { name: (get name cand), description: (get description cand), key: (get key cand), votes: (+ (get votes cand) u1) })
                              ;; mark revealed to block replays
                              (map-set commitments { election-id: election-id, voter: tx-sender }
                                { vote-hash: (get vote-hash comm), revealed: true })
                              ;; Update or initialize winner record for this election.
                              ;; If there's an existing winner with fewer votes than the new total, replace it.
                              (let
                                (
                                  (new-votes (+ (get votes cand) u1))
                                  (w (map-get? winners { election-id: election-id }))
                                )
                                (match w
                                  winner
                                    (if (> new-votes (get votes winner))
                                        (map-set winners { election-id: election-id } { candidate-id: candidate-id, votes: new-votes })
                                        true)
                                  (map-set winners { election-id: election-id } { candidate-id: candidate-id, votes: new-votes })
                                )
                              )
                              (print { event: "vote-tallied", election-id: election-id, candidate-id: candidate-id, votes: (+ (get votes cand) u1) })
                              (ok true)
                            )
                            (err E_HASH_MISMATCH)
                        ))
                      (err E_CANDIDATE_NOT_FOUND)))
            (err E_NOT_REGISTERED))
          (err E_TALLY_NOT_OPEN))
    (err E_ELECTION_NOT_FOUND))
)

;; get-candidate-votes(election-id, candidate-id) -> (ok votes) | (err ...)
;; Accessible only during TALLY or COMPLETED phases to avoid information leakage during voting.
;; Errors: E_ELECTION_NOT_FOUND, E_TALLY_NOT_OPEN, E_CANDIDATE_NOT_FOUND
(define-read-only (get-candidate-votes (election-id uint) (candidate-id uint))
  (match (map-get? elections { id: election-id })
    election
      (if (or (is-eq (get phase election) PHASE-TALLY)
              (is-eq (get phase election) PHASE-COMPLETED))
          (match (map-get? candidates { election-id: election-id, candidate-id: candidate-id })
            cand (ok (get votes cand))
            (err E_CANDIDATE_NOT_FOUND))
          (err E_TALLY_NOT_OPEN))
    (err E_ELECTION_NOT_FOUND))
)

;; get-election-winner(election-id) -> (ok candidate-id) | (err E_NO_WINNER)
;; Returns the current leading candidate id based on tallied votes.
;; If no votes have been revealed, returns E_NO_WINNER.
(define-read-only (get-election-winner (election-id uint))
  (match (map-get? winners { election-id: election-id })
    w (ok (get candidate-id w))
    (err E_NO_WINNER))
)

;; get-all-candidates(election-id) -> (ok (list ...)) always
;; Returns the enumerated candidate id list for the election.
(define-read-only (get-all-candidates (election-id uint))
  (match (map-get? candidate-id-list { election-id: election-id })
    r (ok (get ids r))
    (ok (list)))
)

;; get-candidate(election-id, candidate-id) -> (ok { id, name, description, votes }) | (err E_CANDIDATE_NOT_FOUND)
;; Convenience accessor for per-candidate metadata (excludes secret key).
(define-read-only (get-candidate (election-id uint) (candidate-id uint))
  (match (map-get? candidates { election-id: election-id, candidate-id: candidate-id })
    cand (ok { id: candidate-id, name: (get name cand), description: (get description cand), votes: (get votes cand) })
    (err E_CANDIDATE_NOT_FOUND))
)


;; ============================
;; Utility Functions
;; ============================

;; get-all-active-elections() -> (list 1000 uint)
;; Returns the active election ids list for off-chain discovery.
(define-read-only (get-all-active-elections)
  (var-get active-elections)
)

;; get-election-by-admin(admin) -> (ok election-id) | (err E_ELECTION_NOT_FOUND)
;; Returns active election id owned by the provided admin principal.
(define-read-only (get-election-by-admin (admin principal))
  (match (map-get? admin-active { admin: admin })
    r (ok (get election-id r))
    (err E_ELECTION_NOT_FOUND))
)
