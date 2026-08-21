// ---------- Shared fuzzy/typo-tolerant search helpers ----------
// Used by catalog.js (on-page product grid filtering) and header-search.js
// (live suggestions dropdown), so both search experiences agree on what
// counts as a match. Strips diacritics (so "bautura" matches "băutură")
// and tolerates small misspellings (edit-distance matching per word).
const DIACRITIC_MARKS_RE = new RegExp('[̀-ͯ]', 'g');
function normalizeText(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(DIACRITIC_MARKS_RE, '').trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

function wordFuzzyMatches(textWords, queryWord) {
  if (queryWord.length <= 2) {
    // very short queries (e.g. brand initials) - require a real substring, fuzzy would be too loose
    return textWords.some((w) => w.includes(queryWord));
  }
  const maxDist = queryWord.length <= 5 ? 1 : queryWord.length <= 9 ? 2 : 3;
  return textWords.some((w) => {
    if (w.includes(queryWord)) return true;
    if (Math.abs(w.length - queryWord.length) > maxDist) return false;
    return levenshtein(w, queryWord) <= maxDist;
  });
}

function fuzzyMatch(query, text) {
  const nq = normalizeText(query);
  if (!nq) return true;
  const textWords = normalizeText(text).split(/\s+/).filter(Boolean);
  const queryWords = nq.split(/\s+/).filter(Boolean);
  return queryWords.every((qw) => wordFuzzyMatches(textWords, qw));
}

function formatPrice(p) {
  return p != null ? `${p.toFixed(2).replace('.', ',')} Lei` : '';
}
