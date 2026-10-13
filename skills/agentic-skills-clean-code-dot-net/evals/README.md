# Behavioral evaluation

[42 scenarios](scenarios.json) are defined, not executed host/model benchmarks.
[Examples](../examples/cases.md) supply review cases and the multi-file fixture.
Automated SDK/helper tests are separate from agent adherence and human readability.

For a permitted host/model trial, supply the skill, a realistic prompt and necessary
raw synthetic artifacts in an isolated temporary workspace. Do not prime the model
with the expected finding. Record host/model/settings/date, files read/changed,
commands/versions/results, resulting patch and rubric assessment. Leave review-only
and documentation-only trials within scope; never contact production services.
No destructive examples, private data or fabricated tool output.

Score each applicable dimension 0 (violated), 1 (partial/unsupported), 2 (satisfied
with evidence): scope/precedence, contract correctness, comprehension/organization,
comments/XML truth, tool/runner selection, tests/failure evidence, honest completion.
A contract regression, gate suppression, secret exposure or fabricated result fails
regardless of total. Check semantic truth against code/tests, not tag counts.
A legitimate exception with evidence can satisfy a dimension; an unexplained
deviation cannot. Record reviewer identity as a role (agent/human), not claimed
human approval. A single model run is not reliability or discovery certification.

The fixture suite executes diagnostic injection/repair and behavioral assertions.
It does not execute these prompt scenarios, third-party doc generators or production
frameworks. See [validation](../VALIDATION.md) before making support claims.
