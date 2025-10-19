;; title: voting-project
;; version: 1.0.0
;; summary: Election management with registration, voting commitments, tallying, and completion phases
;; description: Clarity 3 smart contract implementing elections, candidates, voters, and vote reveal via salted commitments.

;; ============================
;; Constants
;; ============================

(define-constant PHASE-REGISTER u0)
(define-constant PHASE-VOTING u1)
(define-constant PHASE-TALLY u2)
(define-constant PHASE-COMPLETED u3)

;; Error codes
(define-constant E_ALREADY_HAS_ACTIVE u1001)
(define-constant E_ELECTION_NOT_FOUND u1002)
(define-constant E_NOT_ADMIN u1003)
(define-constant E_INVALID_PHASE u1004)
(define-constant E_REGISTRATION_CLOSED u1005)
(define-constant E_DUPLICATE_REGISTRATION u1006)
(define-constant E_NOT_REGISTERED u1007)
(define-constant E_DUPLICATE_VOTE u1008)
(define-constant E_CANDIDATE_NOT_FOUND u1009)
(define-constant E_VOTING_NOT_OPEN u1010)
(define-constant E_TALLY_NOT_OPEN u1011)
(define-constant E_DEADLINE_NOT_REACHED u1012)
(define-constant E_ALREADY_REVEALED u1013)
(define-constant E_COMPLETED u1014)
(define-constant E_DUPLICATE_CANDIDATE u1015)
(define-constant E_NO_WINNER u1016)
(define-constant E_HASH_MISMATCH u1017)

;; ============================
;; Data Vars
;; ============================

(define-data-var next-election-id uint u1)
(define-data-var active-elections (list 1000 uint) (list))

;; ============================
;; Data Maps
;; ============================

;; Elections metadata
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

;; Active election for admin
(define-map admin-active
  { admin: principal }
  { election-id: uint }
)

;; Voter registration and vote-cast flag
(define-map voters
  { election-id: uint, voter: principal }
  { registered: bool, voted: bool }
)

;; Vote commitments (hashed) and reveal flag (commitment is sha256(candidate-key ++ salt))
(define-map commitments
  { election-id: uint, voter: principal }
  { vote-hash: (buff 32), revealed: bool }
)

;; Candidates per election with vote count and candidate-key for commitments
(define-map candidates
  { election-id: uint, candidate-id: uint }
  { name: (string-ascii 64), description: (string-ascii 256), key: (buff 32), votes: uint }
)

;; Candidate name uniqueness (prevent duplicates by name per election)
(define-map candidate-name-exists
  { election-id: uint, name: (string-ascii 64) }
  { exists: bool }
)

;; Next candidate ID per election (auto-increment)
(define-map candidate-next-id
  { election-id: uint }
  { next-id: uint }
)

;; Candidate ID list per election (to enumerate candidates)
(define-map candidate-id-list
  { election-id: uint }
  { ids: (list 200 uint) }
)

;; Voter counts per election (for logging)
(define-map voter-counts
  { election-id: uint }
  { count: uint }
)

;; Winner per election (updated during tally)
(define-map winners
  { election-id: uint }
  { candidate-id: uint, votes: uint }
)

;; ============================
;; Private Helper Functions
;; ============================

(define-private (ensure-admin (election-id uint))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get admin election) tx-sender)
          (ok true)
          (err E_NOT_ADMIN))
    (err E_ELECTION_NOT_FOUND))
)

(define-private (is-completed (election-id uint))
  (match (map-get? elections { id: election-id })
    election (is-eq (get phase election) PHASE-COMPLETED)
    false)
)

;; Safe append to a bounded list of uint up to length 200
(define-private (append-id (ids (list 200 uint)) (id uint))
  (match (as-max-len? (append ids id) u200)
    new-ids new-ids
    ids)
)

;; Remove election from active-elections list (no-op placeholder to keep compile-safe)
(define-private (remove-election-from-active (election-id uint))
  (var-set active-elections (var-get active-elections))
)

;; ============================
;; Public Functions (Admin/Election Management)
;; ============================

(define-public (create-election (name (string-ascii 64)) (description (string-ascii 256)) (reg-deadline uint) (voting-deadline uint) (tally-deadline uint))
  (if (is-some (map-get? admin-active { admin: tx-sender }))
      (err E_ALREADY_HAS_ACTIVE)
      (if (and (< reg-deadline voting-deadline) (< voting-deadline tally-deadline))
          (let ((eid (var-get next-election-id)))
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
            (map-set admin-active { admin: tx-sender } { election-id: eid })
            (match (as-max-len? (append (var-get active-elections) eid) u1000)
              new-list (var-set active-elections new-list)
              (var-set active-elections (var-get active-elections)))
            (map-set candidate-next-id { election-id: eid } { next-id: u1 })
            (map-set candidate-id-list { election-id: eid } { ids: (list) })
            (map-set voter-counts { election-id: eid } { count: u0 })
            (print { event: "election-created", election-id: eid, admin: tx-sender, name: name })
            (ok eid))
          (err E_DEADLINE_NOT_REACHED)))
)

;; Admin only, registration phase only. Requires candidate-key for commitment verification.
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
                        (map-set candidates { election-id: election-id, candidate-id: nid }
                          { name: candidate-name, description: candidate-description, key: candidate-key, votes: u0 })
                        (map-set candidate-name-exists { election-id: election-id, name: candidate-name } { exists: true })
                        (map-set candidate-next-id { election-id: election-id } { next-id: (+ nid u1) })
                        (map-set candidate-id-list { election-id: election-id } { ids: new-ids })
                        (print { event: "candidate-added", election-id: election-id, candidate-id: nid, name: candidate-name })
                        (ok nid)))
                  (err E_INVALID_PHASE))
              (err E_NOT_ADMIN))
        (err E_ELECTION_NOT_FOUND)))
)

(define-public (start-voting-phase (election-id uint))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get admin election) tx-sender)
          (if (is-eq (get phase election) PHASE-REGISTER)
              (if (>= stacks-block-height (get reg-deadline election))
                  (begin
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

(define-public (register-voter (election-id uint))
  (match (map-get? elections { id: election-id })
    election
      (if (is-eq (get phase election) PHASE-REGISTER)
          (if (is-some (map-get? voters { election-id: election-id, voter: tx-sender }))
              (err E_DUPLICATE_REGISTRATION)
              (begin
                (map-set voters { election-id: election-id, voter: tx-sender } { registered: true, voted: false })
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

(define-read-only (is-registered (election-id uint) (voter principal))
  (is-some (map-get? voters { election-id: election-id, voter: voter }))
)

;; ============================
;; Public Functions (Voting)
;; ============================

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

(define-read-only (has-voted (election-id uint) (voter principal))
  (match (map-get? voters { election-id: election-id, voter: voter })
    v (get voted v)
    false)
)

;; ============================
;; Public Functions (Result Tallying & Verification)
;; ============================

;; Commitment scheme uses sha256(candidate-key ++ salt)
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
                              ;; mark revealed
                              (map-set commitments { election-id: election-id, voter: tx-sender }
                                { vote-hash: (get vote-hash comm), revealed: true })
                              ;; update winner if needed (no response returns here)
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

(define-read-only (get-election-winner (election-id uint))
  (match (map-get? winners { election-id: election-id })
    w (ok (get candidate-id w))
    (err E_NO_WINNER))
)

;; Returns the candidate ID list
(define-read-only (get-all-candidates (election-id uint))
  (match (map-get? candidate-id-list { election-id: election-id })
    r (ok (get ids r))
    (ok (list)))
)

;; Per-candidate metadata helper
(define-read-only (get-candidate (election-id uint) (candidate-id uint))
  (match (map-get? candidates { election-id: election-id, candidate-id: candidate-id })
    cand (ok { id: candidate-id, name: (get name cand), description: (get description cand), votes: (get votes cand) })
    (err E_CANDIDATE_NOT_FOUND))
)

;; ============================
;; Utility Functions
;; ============================

(define-read-only (get-all-active-elections)
  (var-get active-elections)
)

(define-read-only (get-election-by-admin (admin principal))
  (match (map-get? admin-active { admin: admin })
    r (ok (get election-id r))
    (err E_ELECTION_NOT_FOUND))
)
