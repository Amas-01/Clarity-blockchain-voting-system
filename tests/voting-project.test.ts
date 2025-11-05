import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';
import { createHash } from 'crypto';

describe('Voting Project Contract Tests', () => {
  const accounts = simnet.getAccounts();
  const deployer = accounts.get('deployer')!;
  const admin = accounts.get('wallet_1')!;
  const voter1 = accounts.get('wallet_2')!;
  const voter2 = accounts.get('wallet_3')!;

  // helpers
  const hash32 = (input: string): Uint8Array =>
    new Uint8Array(createHash('sha256').update(input).digest());

  const voteHashFrom = (candidateKey: Uint8Array, salt: Uint8Array): Uint8Array =>
    new Uint8Array(createHash('sha256').update(Buffer.concat([Buffer.from(candidateKey), Buffer.from(salt)])).digest());

  const mineToVoting = () => { simnet.mineEmptyBlocks(100); };
  const mineToTally = () => { simnet.mineEmptyBlocks(100); };
  const mineToComplete = () => { simnet.mineEmptyBlocks(100); };

  describe('Election Creation', () => {
    it('should create an election successfully', () => {
      const { result } = simnet.callPublicFn(
        'voting-project',
        'create-election',
        [
          Cl.stringAscii('Test Election'),
          Cl.stringAscii('A test election'),
          Cl.uint(100),
          Cl.uint(200),
          Cl.uint(300)
        ],
        admin
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('should fail if admin already has an active election', () => {
      simnet.callPublicFn(
        'voting-project',
        'create-election',
        [
          Cl.stringAscii('Test Election 2'),
          Cl.stringAscii('Another test election'),
          Cl.uint(100),
          Cl.uint(200),
          Cl.uint(300)
        ],
        admin
      );
      const { result } = simnet.callPublicFn(
        'voting-project',
        'create-election',
        [
          Cl.stringAscii('Test Election 3'),
          Cl.stringAscii('Third test election'),
          Cl.uint(100),
          Cl.uint(200),
          Cl.uint(300)
        ],
        admin
      );
      expect(result).toBeErr(Cl.uint(1001)); // E_ALREADY_HAS_ACTIVE
    });

    it('should fail if deadlines are not in order', () => {
      const { result } = simnet.callPublicFn(
        'voting-project',
        'create-election',
        [
          Cl.stringAscii('Invalid Election'),
          Cl.stringAscii('Invalid deadlines'),
          Cl.uint(300),
          Cl.uint(200),
          Cl.uint(100)
        ],
        voter1
      );
      expect(result).toBeErr(Cl.uint(1012)); // E_DEADLINE_NOT_REACHED
    });
  });

  describe('Adding Candidates', () => {
    beforeEach(() => {
      simnet.callPublicFn(
        'voting-project',
        'create-election',
        [
          Cl.stringAscii('Candidate Test Election'),
          Cl.stringAscii('Testing candidates'),
          Cl.uint(100),
          Cl.uint(200),
          Cl.uint(300)
        ],
        admin
      );
    });

    it('should add a candidate successfully', () => {
      const { result } = simnet.callPublicFn(
        'voting-project',
        'add-candidate',
        [
          Cl.uint(1),
          Cl.stringAscii('Candidate A'),
          Cl.stringAscii('Description A'),
          Cl.buffer(hash32('candidate-key-a'))
        ],
        admin
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('should fail if not admin', () => {
      const { result } = simnet.callPublicFn(
        'voting-project',
        'add-candidate',
        [
          Cl.uint(1),
          Cl.stringAscii('Candidate B'),
          Cl.stringAscii('Description B'),
          Cl.buffer(hash32('candidate-key-b'))
        ],
        voter1
      );
      expect(result).toBeErr(Cl.uint(1003)); // E_NOT_ADMIN
    });

    it('should fail if duplicate candidate name', () => {
      simnet.callPublicFn(
        'voting-project',
        'add-candidate',
        [
          Cl.uint(1),
          Cl.stringAscii('Candidate A'),
          Cl.stringAscii('Description A'),
          Cl.buffer(hash32('candidate-key-a'))
        ],
        admin
      );
      const { result } = simnet.callPublicFn(
        'voting-project',
        'add-candidate',
        [
          Cl.uint(1),
          Cl.stringAscii('Candidate A'),
          Cl.stringAscii('Description A'),
          Cl.buffer(hash32('candidate-key-a'))
        ],
        admin
      );
      expect(result).toBeErr(Cl.uint(1015)); // E_DUPLICATE_CANDIDATE
    });

    it('should fail if not in register phase', () => {
      // Advance to voting phase
      mineToVoting();
      simnet.callPublicFn('voting-project', 'start-voting-phase', [Cl.uint(1)], admin);
      const { result } = simnet.callPublicFn(
        'voting-project',
        'add-candidate',
        [
          Cl.uint(1),
          Cl.stringAscii('Candidate B'),
          Cl.stringAscii('Description B'),
          Cl.buffer(hash32('candidate-key-b'))
        ],
        admin
      );
      expect(result).toBeErr(Cl.uint(1004)); // E_INVALID_PHASE
    });
  });

  describe('Voter Registration', () => {
    beforeEach(() => {
      simnet.callPublicFn(
        'voting-project',
        'create-election',
        [
          Cl.stringAscii('Registration Test'),
          Cl.stringAscii('Testing registration'),
          Cl.uint(100),
          Cl.uint(200),
          Cl.uint(300)
        ],
        admin
      );
    });

    it('should register a voter successfully', () => {
      const { result } = simnet.callPublicFn('voting-project', 'register-voter', [Cl.uint(1)], voter1);
      expect(result).toBeOk(Cl.bool(true));
    });

    it('should fail if duplicate registration', () => {
      simnet.callPublicFn('voting-project', 'register-voter', [Cl.uint(1)], voter1);
      const { result } = simnet.callPublicFn('voting-project', 'register-voter', [Cl.uint(1)], voter1);
      expect(result).toBeErr(Cl.uint(1006)); // E_DUPLICATE_REGISTRATION
    });

    it('should fail if not in register phase', () => {
      mineToVoting();
      simnet.callPublicFn('voting-project', 'start-voting-phase', [Cl.uint(1)], admin);
      const { result } = simnet.callPublicFn('voting-project', 'register-voter', [Cl.uint(1)], voter1);
      expect(result).toBeErr(Cl.uint(1005)); // E_REGISTRATION_CLOSED
    });
  });

  describe('Voting and Revealing', () => {
    beforeEach(() => {
      simnet.callPublicFn(
        'voting-project',
        'create-election',
        [
          Cl.stringAscii('Voting Test'),
          Cl.stringAscii('Testing voting'),
          Cl.uint(100),
          Cl.uint(200),
          Cl.uint(300)
        ],
        admin
      );
      simnet.callPublicFn(
        'voting-project',
        'add-candidate',
        [
          Cl.uint(1),
          Cl.stringAscii('Candidate A'),
          Cl.stringAscii('Description A'),
          Cl.buffer(hash32('keyA'))
        ],
        admin
      );
      simnet.callPublicFn(
        'voting-project',
        'add-candidate',
        [
          Cl.uint(1),
          Cl.stringAscii('Candidate B'),
          Cl.stringAscii('Description B'),
          Cl.buffer(hash32('keyB'))
        ],
        admin
      );
      simnet.callPublicFn('voting-project', 'register-voter', [Cl.uint(1)], voter1);
      simnet.callPublicFn('voting-project', 'register-voter', [Cl.uint(1)], voter2);
      mineToVoting();
      simnet.callPublicFn('voting-project', 'start-voting-phase', [Cl.uint(1)], admin);
    });

    it('should cast a vote successfully', () => {
      const salt = hash32('salt1');
      const candidateKey = hash32('keyA');
      const voteHash = voteHashFrom(candidateKey, salt);
      const { result } = simnet.callPublicFn(
        'voting-project',
        'cast-vote',
        [Cl.uint(1), Cl.uint(1), Cl.buffer(voteHash)],
        voter1
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it('should fail if duplicate vote', () => {
      const salt = hash32('salt1');
      const candidateKey = hash32('keyA');
      const voteHash = voteHashFrom(candidateKey, salt);
      simnet.callPublicFn(
        'voting-project',
        'cast-vote',
        [Cl.uint(1), Cl.uint(1), Cl.buffer(voteHash)],
        voter1
      );
      const { result } = simnet.callPublicFn(
        'voting-project',
        'cast-vote',
        [Cl.uint(1), Cl.uint(2), Cl.buffer(voteHash)],
        voter1
      );
      expect(result).toBeErr(Cl.uint(1008)); // E_DUPLICATE_VOTE
    });

    it('should reveal vote successfully', () => {
      const salt = hash32('salt1');
      const candidateKey = hash32('keyA');
      const voteHash = voteHashFrom(candidateKey, salt);
      simnet.callPublicFn(
        'voting-project',
        'cast-vote',
        [Cl.uint(1), Cl.uint(1), Cl.buffer(voteHash)],
        voter1
      );
      mineToTally();
      simnet.callPublicFn('voting-project', 'start-tally-phase', [Cl.uint(1)], admin);
      const { result } = simnet.callPublicFn(
        'voting-project',
        'reveal-vote',
        [Cl.uint(1), Cl.uint(1), Cl.buffer(salt)],
        voter1
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it('should fail reveal if hash mismatch', () => {
      const salt = hash32('salt1');
      const candidateKey = hash32('keyA');
      const voteHash = voteHashFrom(candidateKey, salt);
      const wrongSalt = hash32('wrong');
      simnet.callPublicFn(
        'voting-project',
        'cast-vote',
        [Cl.uint(1), Cl.uint(1), Cl.buffer(voteHash)],
        voter1
      );
      mineToTally();
      simnet.callPublicFn('voting-project', 'start-tally-phase', [Cl.uint(1)], admin);
      const { result } = simnet.callPublicFn(
        'voting-project',
        'reveal-vote',
        [Cl.uint(1), Cl.uint(1), Cl.buffer(wrongSalt)],
        voter1
      );
      expect(result).toBeErr(Cl.uint(1017)); // E_HASH_MISMATCH
    });
  });

  describe('Tallying and Completion', () => {
    beforeEach(() => {
      simnet.callPublicFn(
        'voting-project',
        'create-election',
        [
          Cl.stringAscii('Tally Test'),
          Cl.stringAscii('Testing tally'),
          Cl.uint(100),
          Cl.uint(200),
          Cl.uint(300)
        ],
        admin
      );
      simnet.callPublicFn(
        'voting-project',
        'add-candidate',
        [
          Cl.uint(1),
          Cl.stringAscii('Candidate A'),
          Cl.stringAscii('Description A'),
          Cl.buffer(hash32('keyA'))
        ],
        admin
      );
      simnet.callPublicFn('voting-project', 'register-voter', [Cl.uint(1)], voter1);
      mineToVoting();
      simnet.callPublicFn('voting-project', 'start-voting-phase', [Cl.uint(1)], admin);
      const salt = hash32('salt1');
      const candidateKey = hash32('keyA');
      const voteHash = voteHashFrom(candidateKey, salt);
      simnet.callPublicFn(
        'voting-project',
        'cast-vote',
        [Cl.uint(1), Cl.uint(1), Cl.buffer(voteHash)],
        voter1
      );
      mineToTally();
      simnet.callPublicFn('voting-project', 'start-tally-phase', [Cl.uint(1)], admin);
      simnet.callPublicFn(
        'voting-project',
        'reveal-vote',
        [Cl.uint(1), Cl.uint(1), Cl.buffer(salt)],
        voter1
      );
    });

    it('should get candidate votes', () => {
      const { result } = simnet.callReadOnlyFn(
        'voting-project',
        'get-candidate-votes',
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('should complete election', () => {
      mineToComplete();
      const { result } = simnet.callPublicFn('voting-project', 'complete-election', [Cl.uint(1)], admin);
      expect(result).toBeOk(Cl.bool(true));
    });

    it('should get election winner', () => {
      mineToComplete();
      simnet.callPublicFn('voting-project', 'complete-election', [Cl.uint(1)], admin);
      const { result } = simnet.callReadOnlyFn('voting-project', 'get-election-winner', [Cl.uint(1)], deployer);
      expect(result).toBeOk(Cl.uint(1));
    });
  });

  describe('Read-Only Functions', () => {
    beforeEach(() => {
      simnet.callPublicFn(
        'voting-project',
        'create-election',
        [
          Cl.stringAscii('Read Test'),
          Cl.stringAscii('Testing reads'),
          Cl.uint(100),
          Cl.uint(200),
          Cl.uint(300)
        ],
        admin
      );
      simnet.callPublicFn(
        'voting-project',
        'add-candidate',
        [
          Cl.uint(1),
          Cl.stringAscii('Candidate A'),
          Cl.stringAscii('Description A'),
          Cl.buffer(hash32('keyA'))
        ],
        admin
      );
      simnet.callPublicFn('voting-project', 'register-voter', [Cl.uint(1)], voter1);
    });

    it('should get election details', () => {
      const { result } = simnet.callReadOnlyFn('voting-project', 'get-election-details', [Cl.uint(1)], deployer);
      expect(result).toBeOk(
        Cl.tuple({
          admin: Cl.principal(admin),
          name: Cl.stringAscii('Read Test'),
          description: Cl.stringAscii('Testing reads'),
          phase: Cl.uint(0),
          'reg-deadline': Cl.uint(100),
          'voting-deadline': Cl.uint(200),
          'tally-deadline': Cl.uint(300)
        })
      );
    });

    it('should check if registered', () => {
      const { result } = simnet.callReadOnlyFn(
        'voting-project',
        'is-registered',
        [Cl.uint(1), Cl.principal(voter1)],
        deployer
      );
      expect(result).toBeBool(true);
    });

    it('should get all candidates', () => {
      const { result } = simnet.callReadOnlyFn('voting-project', 'get-all-candidates', [Cl.uint(1)], deployer);
      expect(result).toBeOk(Cl.list([Cl.uint(1)]));
    });

    it('should get candidate details', () => {
      const { result } = simnet.callReadOnlyFn('voting-project', 'get-candidate', [Cl.uint(1), Cl.uint(1)], deployer);
      expect(result).toBeOk(
        Cl.tuple({
          id: Cl.uint(1),
          name: Cl.stringAscii('Candidate A'),
          description: Cl.stringAscii('Description A'),
          votes: Cl.uint(0)
        })
      );
    });
  });
});
