/** Bounded lexical candidates. Similar passages do not prove duplicate intent or justify consolidation. */
import { hash, type Observation } from "./domain.ts";
import { activeFacts } from "./rules.ts";
export function nearDuplicateReview(observations: Observation[]) {
  const pages = observations
    .filter(
      (o) =>
        o.response?.status === 200 &&
        o.finalUrl === o.url &&
        activeFacts(o)?.text,
    )
    .slice(0, 2000);
  const sets = pages.map((o) => {
    const tokens =
      activeFacts(o)!
        .text.toLocaleLowerCase()
        .match(/[\p{L}\p{N}]+/gu)
        ?.slice(0, 2000) ?? [];
    const shingles = new Set<string>();
    for (let i = 0; i + 4 < tokens.length; i++)
      shingles.add(hash(tokens.slice(i, i + 5).join(" ")).slice(0, 16));
    return shingles;
  });
  const buckets = new Map<string, number[]>();
  sets.forEach((set, index) =>
    [...set]
      .sort()
      .slice(0, 8)
      .forEach((fingerprint) => {
        const list = buckets.get(fingerprint) ?? [];
        list.push(index);
        buckets.set(fingerprint, list);
      }),
  );
  const candidates = new Set<string>();
  let skippedBuckets = 0;
  for (const list of buckets.values()) {
    if (list.length > 30) {
      skippedBuckets++;
      continue;
    }
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        if (candidates.size >= 10000) break;
        candidates.add(list[i] + ":" + list[j]);
      }
  }
  const pairs = [];
  for (const key of candidates) {
    const [a, b] = key.split(":").map(Number),
      first = sets[a],
      second = sets[b];
    const intersection = [...first].filter((value) => second.has(value)).length,
      union = first.size + second.size - intersection,
      similarity = union ? intersection / union : 0;
    if (similarity < 0.8) continue;
    pairs.push({
      urls: [pages[a].url, pages[b].url],
      evidenceIds: [pages[a].id, pages[b].id],
      similarity,
      metric: "Jaccard overlap of bounded normalized five-token shingles",
      observationPaths: [
        pages[a].render?.status === "observed" ? "rendered" : "HTTP",
        pages[b].render?.status === "observed" ? "rendered" : "HTTP",
      ],
      review:
        "Check whether the pages serve different reader needs, share template text or declare different preferred URLs. Do not merge them automatically.",
      passages: [
        activeFacts(pages[a])!.text.slice(0, 500),
        activeFacts(pages[b])!.text.slice(0, 500),
      ],
    });
  }
  return {
    pairs,
    coverage: {
      availableObservations: observations.length,
      reviewedPages: pages.length,
      candidatePairs: candidates.size,
      skippedCommonBuckets: skippedBuckets,
      sparsePages: sets.filter((s) => s.size === 0).length,
    },
    limits: {
      pages: 2000,
      tokensPerPage: 2000,
      selectedFingerprints: 8,
      bucketPages: 30,
      candidatePairs: 10000,
      reviewThreshold: 0.8,
    },
    limitations: [
      "The sample can miss similar pages. This is not a comparison of every possible pair or a complete review of meaning.",
      "Large groups of common passages are skipped. Pages outside the sample have not been checked.",
      "The 0.8 similarity threshold helps select pages for human review. It is not a search-engine requirement.",
      "Text normalisation and word boundaries can behave differently across languages.",
      "There is too little text to compare some pages using this method. That does not establish low-quality content.",
      "The original page evidence, preferred-URL declarations and request identities are kept separate.",
    ],
  };
}
