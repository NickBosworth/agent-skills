# Delivery validation

Version **1.0.0** · Checked **10 October 2026**

This report concerns the delivered skill package and helper scripts. It is not a claim that an evaluated LLM produced a production-quality interface, and it is not a WCAG certification.

## Performed and passed

| Check | Observed result |
|---|---|
| Core Agent Skills structure | Folder and name agree; required metadata is present. The core has 133 lines and 1,672 whitespace-delimited words. Description: 534 characters. |
| YAML parsing | Frontmatter also parsed with PyYAML 6.0.3; metadata keys and values are strings. The bundled restricted parser passed its checks. |
| Python syntax | All shipped Python source files parsed successfully. |
| JSON parsing | All shipped JSON data and templates parsed successfully. |
| Catalogue consistency | 96 unique diagnostic entries across eight families; source IDs resolve. All title, signal, cost, repair, verification and qualification fields match the corresponding Markdown entries. |
| Sources and scenarios | 50 source records; 18 evaluation scenarios, with valid related diagnostic IDs and populated setup/expectation fields. |
| Example retention | 18 copyable prompts and eight worked examples are retained inside the installed package. |
| Helper regressions | **79 tests passed**, with no failures or skips in the delivery run. The tests cover lookup, review-record rules, invalid inputs, CLI exits, links, source consistency, symlink refusal, hash tampering and browser input validation. |
| Untouched review template | Produces INCOMPLETE, not a fabricated pass. |
| Local links and package files | Bundled validator passed. No missing local Markdown targets or package-escaping local links were found. |
| File integrity and archive | SHA-256 manifest checked; ZIP integrity, safe member paths and checksums checked again after extraction to a fresh directory. |

The [helper test log](validation/helper-tests.txt) is included. Test fixtures contain explicitly synthetic review declarations, not fabricated real-product evidence. Checksum paths use portable forward slashes.

## Attempted but blocked

The optional real-browser smoke runner started a local fixture server and launched Chromium, but navigation to the loopback fixture was blocked with **net::ERR_BLOCKED_BY_ADMINISTRATOR**. The run stopped before a completed capture. **This is not a passed browser integration test.** No browser/network policy was disabled or bypassed.

The [attempt record](validation/browser-smoke-attempt.txt) records the result. Browser input-validation tests passed, but the end-to-end capture helper remains unverified in this delivery environment. The fixture and runner are included for a compatible authorized environment. No browser screenshots are represented as inspected.

Environment: Python **3.13.5**, Playwright **1.57.0**, system Chromium **144.0.7559.96** on Linux. The core skill does not require the optional browser helper. Python 3.10+ compatibility is based on used language features, not an executed multi-version operating-system matrix.

## Researched or reviewed, not runtime certified

Sources were consulted on the research date and classified in the [source register](references/source-register.md). Selected WCAG wording, applicability and thresholds were cross-checked against W3C material. Host installation paths were checked against official OpenCode, Codex and Claude Code documentation. These are documentation checks, not actual skill-discovery tests in each host.

The catalogue and guidance are original synthesis. Their breadth does not prove that all possible failures are covered or that every entry is disproportionately common in AI-authored work. The 24 recognizable visual shortcuts are diagnostic examples, not authorship signatures or blanket bans.

## Not performed

No fresh-agent controlled comparison, representative-user study, real-device matrix, screen-reader product evaluation, full accessibility conformance assessment, production field-performance measurement or live application security audit was performed. No guarantee of model effectiveness, universal aesthetic quality or release readiness is made.

The [evaluation protocol](evals/README.md) and 18 scenarios are supplied to test skill effectiveness with the actual model, harness and codebase. They are test designs, not completed experimental results.

## Reproduce the checks

```sh
python scripts/validate_package.py --checksums
python -m unittest discover -s tests -v
python tests/browser_smoke.py --out /tmp/web-ui-craft-smoke-new
```

The first two commands use only the Python standard library. The third requires the optional approved Playwright/Chromium environment and loopback navigation permission. Review tool documentation before running any script. Do not confuse a structurally complete review record with independently verified evidence.
