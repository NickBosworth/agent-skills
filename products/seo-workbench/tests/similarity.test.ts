import test from "node:test";
import assert from "node:assert/strict";
import { nearDuplicateReview } from "../src/similarity.ts";
import { extract } from "../src/extract.ts";
import type { Observation } from "../src/domain.ts";
const page = (path: string, text: string): Observation => {
  const url = "https://www.example.com/" + path,
    body = "<main>" + text + "</main>";
  return {
    id: path,
    url,
    originalUrl: url,
    finalUrl: url,
    timestamp: "2026-10-11T00:00:00Z",
    attempts: [],
    response: {
      url,
      status: 200,
      headers: {},
      body,
      bytes: body.length,
      durationMs: 0,
      address: "93.184.216.34",
      requestedAt: "2026-10-11T00:00:00Z",
    },
    facts: extract(body, url),
    render: null,
    error: null,
  };
};
test("bounded near-duplicate review detects shared passages while preserving original URLs and uncertainty", () => {
  const text =
    "Synthetic workshop instructions explain assembly materials lighting safety and original warranty terms. Follow these detailed original steps before installing the sample lamp in a dry room. The synthetic manual contains useful maintenance guidance for demonstration users.";
  const first = page("a", text),
    second = page("b", text + " Additional illustration."),
    unrelated = page(
      "c",
      "Independent synthetic archive about historical geographic mapping and astronomical observations. Compare different coordinate systems before interpreting the cartographic source collection.",
    );
  const review = nearDuplicateReview([first, second, unrelated]);
  assert.equal(review.pairs.length, 1);
  assert.deepEqual(review.pairs[0].urls, [first.url, second.url]);
  assert.ok(review.pairs[0].similarity >= 0.8);
  assert.ok(review.pairs[0].review.includes("Do not merge them automatically"));
  assert.equal(first.facts!.text, text);
  assert.equal(review.coverage.reviewedPages, 3);
});
test("sparse text and oversized common buckets remain explicit uncheckable coverage", () => {
  const sparse = nearDuplicateReview([page("a", "Tiny sample")]);
  assert.equal(sparse.coverage.sparsePages, 1);
  assert.equal(sparse.pairs.length, 0);
  const common = nearDuplicateReview(
    Array.from({ length: 40 }, (_, i) =>
      page(
        "p" + i,
        "Original repeated synthetic passage explains exactly the same common shared maintenance instructions for a lamp.",
      ),
    ),
  );
  assert.ok(common.coverage.skippedCommonBuckets > 0);
  assert.equal(common.coverage.candidatePairs, 0);
  assert.ok(common.limitations.some((l) => l.includes("miss similar pages")));
  const limited = nearDuplicateReview(
    Array.from({ length: 2001 }, (_, i) => page("p" + i, "Tiny sample")),
  );
  assert.equal(limited.coverage.reviewedPages, 2000);
  assert.equal(limited.coverage.availableObservations, 2001);
});
