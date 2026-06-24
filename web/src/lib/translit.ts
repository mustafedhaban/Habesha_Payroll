/**
 * Phonetic Latin → Ethiopic (Amharic fidel) transliteration for names.
 *
 * This is a best-effort, rule-based transliteration — NOT a translation.
 * Ethiopic is an abugida: each consonant has seven vowel "orders". We map a
 * Latin consonant to its 1st-order base codepoint and add an offset for the
 * following vowel. The result is meant as an editable suggestion: common
 * Ethiopian names (Abebe→አበበ, Kebede→ከበደ, Selam→ሰላም) come out right, but the
 * user can always correct it.
 */

// 1st-order (ግዕዝ) base codepoints. Digraphs are matched before single letters.
const BASES: Record<string, number> = {
  sh: 0x1238, ch: 0x1278, ts: 0x1338, ny: 0x1298, gn: 0x1298,
  zh: 0x12e0, kh: 0x12b8, ph: 0x1348,
  h: 0x1200, l: 0x1208, m: 0x1218, r: 0x1228, s: 0x1230,
  q: 0x1240, b: 0x1260, v: 0x1268, t: 0x1270, n: 0x1290,
  k: 0x12a8, w: 0x12c8, z: 0x12d8, y: 0x12e8, d: 0x12f0,
  j: 0x1300, g: 0x1308, f: 0x1348, p: 0x1350, c: 0x12a8, x: 0x12b8,
};

const DIGRAPHS = ['sh', 'ch', 'ts', 'ny', 'gn', 'zh', 'kh', 'ph'];

// Vowel order offsets added to a consonant base:
// 0=ä(1st) 1=u 2=i 3=a 4=e 5=ɨ(6th/none) 6=o
const VOWEL_ORDER: Record<string, number> = { e: 0, u: 1, i: 2, a: 3, o: 6 };
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

// Standalone vowels use the አ (alef) carrier family. Name-initial "a" is
// overwhelmingly አ, so it gets the 1st order rather than the 4th.
const CARRIER: Record<string, number> = {
  a: 0x12a0, e: 0x12a4, i: 0x12a2, o: 0x12a6, u: 0x12a1,
};

const SIXTH_ORDER = 5; // consonant with no following vowel

export function toAmharic(input: string): string {
  const s = input.toLowerCase();
  let out = '';
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    // Non-letters (spaces, hyphens, apostrophes) pass through unchanged.
    if (!/[a-z]/.test(ch)) {
      out += ch;
      i += 1;
      continue;
    }

    // Consonant — try a two-letter digraph first, then a single letter.
    const two = s.slice(i, i + 2);
    let cons: string | null = null;
    if (DIGRAPHS.includes(two)) cons = two;
    else if (BASES[ch] !== undefined && !VOWELS.has(ch)) cons = ch;

    if (cons) {
      const base = BASES[cons];
      i += cons.length;
      const next = s[i];
      if (next && VOWELS.has(next)) {
        out += String.fromCodePoint(base + VOWEL_ORDER[next]);
        i += 1;
      } else {
        out += String.fromCodePoint(base + SIXTH_ORDER);
      }
      continue;
    }

    // Standalone vowel.
    if (VOWELS.has(ch)) {
      out += String.fromCodePoint(CARRIER[ch]);
      i += 1;
      continue;
    }

    // Unknown letter — drop it rather than emit garbage.
    i += 1;
  }

  return out;
}
