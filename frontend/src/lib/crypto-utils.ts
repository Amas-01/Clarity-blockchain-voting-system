/**
 * Cryptographic utilities for the commit-reveal scheme.
 */

export const generateSalt = (): Uint8Array => {
  const salt = new Uint8Array(32);
  window.crypto.getRandomValues(salt);
  return salt;
};

export const hexToUint8Array = (hex: string): Uint8Array => {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) throw new Error("Invalid hex string");
  const arr = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    arr[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return arr;
};

export const uint8ArrayToHex = (arr: Uint8Array): string => {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Computes sha256(candidateKey ++ salt)
 * Both inputs are 32-byte Uint8Arrays
 */
export const computeVoteHash = async (candidateKey: Uint8Array, salt: Uint8Array): Promise<Uint8Array> => {
  // Concat candidateKey (32 bytes) + salt (32 bytes)
  const combined = new Uint8Array(64);
  combined.set(candidateKey);
  combined.set(salt, 32);

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined);
  return new Uint8Array(hashBuffer);
};
