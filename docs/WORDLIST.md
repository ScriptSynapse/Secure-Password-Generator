# Passphrase word list — provenance

`src/lib/wordlist.ts` contains exactly **7,776** words (log₂ 7776 ≈ 12.925 bits per word). It is generated, not hand-written, by `scripts/build-wordlist.mjs`.

## Source

Hunspell `en_US.dic` (as shipped by the Debian/Ubuntu `hunspell-en-us` package), which is generated from **SCOWL** (Spell Checker Oriented Word Lists) by Kevin Atkinson — http://wordlist.aspell.net/

## Selection rules

1. Lowercase ASCII letters only, length 4–7 (no proper nouns, apostrophes or accents).
2. Root entries with at least one affix flag (proxy for common words).
3. Remove words containing any blocklisted substring (profanity, slurs, violence, etc.).
4. Rank by number of affix flags; break ties by SHA-256 of the word (avoids alphabetical bias at the cut-off).
5. Take the top 7,776 and sort alphabetically.

The SHA-256 of the newline-joined list is recorded in the file and checked by `tests/unit/passphrase.test.ts`. Rebuild with `npm run wordlist -- /path/to/en_US.dic`.

## SCOWL licence notice

> Copyright 2000-2011 by Kevin Atkinson
>
> Permission to use, copy, modify, distribute and sell these word lists, the associated scripts, the output created from the scripts, and its documentation for any purpose is hereby granted without fee, provided that the above copyright notice appears in all copies and that both that copyright notice and this permission notice appear in supporting documentation. Kevin Atkinson makes no representations about the suitability of this array for any purpose. It is provided "as is" without express or implied warranty.

SCOWL incorporates material from other word lists under compatible permissive terms; see the full SCOWL README for details.
