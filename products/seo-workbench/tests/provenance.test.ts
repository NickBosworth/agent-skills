import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rules } from "../src/rules.ts";
const sources = JSON.parse(
  readFileSync(new URL("../data/sources.json", import.meta.url), "utf8"),
).sources;
const skill = JSON.parse(
  readFileSync(
    new URL(
      "../../../skills/agentic-skills-seo-expert/data/rules.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
test("all executable rules resolve source IDs and canonical skill IDs without copying guidance", () => {
  assert.equal(new Set(rules.map((r) => r.id)).size, rules.length);
  for (const rule of rules) {
    assert.ok(rule.version);
    assert.ok(rule.remediation);
    assert.ok(rule.verification);
    assert.ok(rule.skillIds.length);
    for (const id of rule.sourceIds)
      assert.ok(
        sources.some(
          (s: any) => s.id === id && !s.reviewStatus.startsWith("unverified"),
        ),
      );
    for (const id of rule.skillIds)
      assert.ok(skill.rules.some((r: any) => r.id === id));
  }
});
test("canonical skill guidance drift is detected by a reviewed hash, not silently accepted", async () => {
  const { hash } = await import("../src/domain.ts");
  const mapping = JSON.parse(
    readFileSync(
      new URL("../data/skill-mapping.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(hash(JSON.stringify(skill)), mapping.catalogueHash);
  assert.equal(mapping.skillVersion, "2.0.0");
  assert.deepEqual(
    mapping.implemented,
    Array.from(new Set(rules.flatMap((r) => r.skillIds))).sort(),
  );
  assert.equal(
    mapping.implemented.length + mapping.guidanceOnly.length,
    skill.rules.length,
  );
});
