import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { errorCode } from "../src/domain.ts";
import { explainError, isPublicErrorCode } from "../src/messages.ts";

test("unknown diagnostic slugs and private messages cannot become public labels", () => {
  for (const value of [
    "synthetic-private-identifier",
    "fictional-contact@example.invalid",
    "Synthetic private diagnostic.",
  ])
    assert.equal(errorCode(new Error(value)), "operation-failed");
  assert.equal(errorCode(new Error("provider-timeout")), "provider-timeout");
  assert.equal(
    errorCode(
      Object.assign(new Error("Synthetic private diagnostic"), {
        code: "ENOSPC",
      }),
    ),
    "storage-full",
  );
  assert.equal(errorCode({ message: "provider-timeout" }), "operation-failed");
  for (const value of ["__proto__", "constructor", "toString"]) {
    assert.equal(errorCode(new Error(value)), "operation-failed");
    assert.equal(typeof explainError(value), "string");
  }
});

test("every literal production error label has a maintained public explanation", () => {
  const directory = new URL("../src/", import.meta.url),
    codes = new Set<string>();
  for (const name of readdirSync(directory).filter((name) =>
    name.endsWith(".ts"),
  ))
    for (const match of readFileSync(new URL(name, directory), "utf8").matchAll(
      /new Error\(\s*["']([a-z][a-z0-9-]{0,60})["']\s*\)/g,
    ))
      codes.add(match[1]);
  assert.ok(codes.size > 100);
  for (const code of codes) {
    assert.equal(
      isPublicErrorCode(code),
      true,
      "Missing public diagnostic label: " + code,
    );
    assert.equal(errorCode(new Error(code)), code);
    assert.ok(explainError(code).length > 20);
  }
});
