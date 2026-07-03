/**
 * Deterministic coordinate hash (spec §4.1, §5). Lowercase hex SHA-256 of
 * `${n}:${floor}`. Stable identity for bookmarks/URLs (Unit 06) and presence
 * sync (Unit 07). Locked by INV-4.
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { utf8Bytes } from '../content/bytes';
import type { Coordinate } from './types';

export function hash(c: Coordinate): string {
  return bytesToHex(sha256(utf8Bytes(`${c.n}:${c.floor}`)));
}
