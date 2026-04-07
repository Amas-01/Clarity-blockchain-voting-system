/**
 * Implement the exact commitment scheme from the contract.
 * vote-hash = sha256(candidate-key ++ salt)
 * Both candidate-key and salt are exactly 32 bytes (buff 32).
 */

/**
 * Computes SHA-256 hash of provided bytes.
 */
export async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

/**
 * Encodes the string as UTF-8 using TextEncoder.
 */
export function stringToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

/**
 * Computes SHA-256 hash of a UTF-8 string.
 */
export async function sha256String(input: string): Promise<Uint8Array> {
  return sha256Bytes(stringToBytes(input));
}

/**
 * Generates the vote commitment hash.
 * Concatenates candidateKey ++ salt (total 64 bytes) and hashes the result.
 */
export async function generateCommitment(
  candidateKey: Uint8Array, // exactly 32 bytes
  salt: Uint8Array         // exactly 32 bytes
): Promise<Uint8Array> {
  if (candidateKey.length !== 32 || salt.length !== 32) {
    throw new Error("Candidate key and salt must be exactly 32 bytes");
  }

  const combined = new Uint8Array(64);
  combined.set(candidateKey);
  combined.set(salt, 32);

  return sha256Bytes(combined);
}

/**
 * Generates a high-entropy 32-byte salt for the voter.
 */
export function generateRandomSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  window.crypto.getRandomValues(salt);
  return salt;
}

/**
 * Converts Uint8Array to lowercase hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts lowercase hex string to Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have an even length");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Recomputes the commitment and verifies it against a stored hash.
 */
export async function verifyCommitment(
  candidateKey: Uint8Array,
  salt: Uint8Array,
  storedHash: Uint8Array
): Promise<boolean> {
  const computedHash = await generateCommitment(candidateKey, salt);
  
  if (computedHash.length !== storedHash.length) return false;
  
  for (let i = 0; i < computedHash.length; i++) {
    if (computedHash[i] !== storedHash[i]) return false;
  }
  
  return true;
}
