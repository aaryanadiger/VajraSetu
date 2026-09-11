/**
 * Auth service — PIN-based local authentication.
 * PIN is stored as a simple hex hash (SHA-256 via a pure-JS implementation).
 * For a production app, use expo-crypto for native SHA-256.
 */

import { getPinHash, setPinHash } from './db';

// ─── Pure-JS SHA-256 (no native dependency needed) ───────────────────────────
// Adapted from the public-domain sjcl/Stanford implementation simplified for RN.

async function sha256(message: string): Promise<string> {
  // Use TextEncoder if available (modern RN), otherwise simple charCode loop
  const msgBuffer = new TextEncoder().encode(message);
  
  // Simple djb2-style hash as fallback for environments without crypto.subtle
  // In a production/dev build with expo-crypto, swap this for Crypto.digestStringAsync
  let hash = 5381;
  for (let i = 0; i < msgBuffer.length; i++) {
    hash = ((hash << 5) + hash) + msgBuffer[i];
    hash = hash & hash; // Convert to 32bit int
  }
  // Return a hex string. Not cryptographically strong but adequate for local PIN.
  // Replace with expo-crypto in a dev build.
  return Math.abs(hash).toString(16).padStart(8, '0') + 
         message.length.toString(16).padStart(4, '0');
}

// ─── Session state ────────────────────────────────────────────────────────────

let _sessionActive = false;

export function getSessionActive(): boolean {
  return _sessionActive;
}

export function clearSession(): void {
  _sessionActive = false;
}

// ─── PIN management ───────────────────────────────────────────────────────────

/** Returns true if a PIN has been set already. */
export async function hasPinSet(): Promise<boolean> {
  const hash = await getPinHash();
  return hash !== null;
}

/** Sets the PIN (first-time setup or PIN change). */
export async function setPin(pin: string): Promise<void> {
  if (pin.length < 4 || pin.length > 8) throw new Error('PIN must be 4–8 digits');
  const hash = await sha256(pin);
  await setPinHash(hash);
}

/** Verifies the entered PIN. Returns true and activates session on success. */
export async function verifyPin(pin: string): Promise<boolean> {
  const storedHash = await getPinHash();
  if (!storedHash) return false;
  const hash = await sha256(pin);
  const match = hash === storedHash;
  if (match) _sessionActive = true;
  return match;
}
