// Arabic text pasted out of a PDF arrives damaged: the extractor drops the
// spaces between words and transposes letters around lam ("الموارد" comes out
// as "املوارد"). Nothing downstream touches the value — it goes from the field
// straight into the column and every screen and email renders the same string —
// so the damage has to be caught at the point of entry.
//
// The transposition can't be undone (the original ordering is gone), but the
// invisible characters that ride along with a paste can be stripped safely, and
// the missing-space signature is detectable well enough to warn about.

// Zero-width joiners/non-joiners, the BOM, and the bidirectional embedding and
// override marks. Editors and PDF viewers sprinkle these through copied Arabic;
// they are invisible but corrupt sorting, search and line breaking.
const INVISIBLE_CHARS = /[​-‏‪-‮⁦-⁩﻿]/g;

/** Strips invisible control marks and normalises whitespace. Always safe. */
export const cleanPastedText = (value?: string | null): string =>
  (value ?? "")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();

/** Same, but preserves paragraph breaks — for multi-line fields. */
export const cleanPastedMultiline = (value?: string | null): string =>
  (value ?? "")
    .replace(INVISIBLE_CHARS, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

// An Arabic word longer than this without a single space is not something a
// person types — it's two or more words fused by a PDF extractor. Real Arabic
// words top out well below it, so the check doesn't fire on ordinary input.
const FUSED_WORD_LENGTH = 15;

/**
 * True when the text carries the signature of a mangled PDF paste, so the UI
 * can warn before the value is saved and propagated to reports and emails.
 */
export const looksLikeGarbledPaste = (value?: string | null): boolean => {
  const text = cleanPastedText(value);
  if (!text) return false;
  return text
    .split(" ")
    .some((word) => word.length >= FUSED_WORD_LENGTH && /[؀-ۿ]/.test(word));
};
