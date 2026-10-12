# Copy audit and MCP release assessment

Reviewed on 2026-10-11. This review assesses clarity, accuracy and usefulness,
not whether an author used AI. Captured website text and machine field names
remain unchanged.

## Copy audit

Reviewed the page title, header, starting form, audit status and controls, Overview,
Actions, Pages, Links, Content, check results, comparison, imports, exports, empty
and error states, HTML/Markdown reports, rule guidance, command help and MCP tool
descriptions. Technical documentation remains precise where implementation details
are needed.

| Finding                                              | Correction                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| “Evidence before advice” in the title and page       | Removed the slogan; the title identifies the product.                            |
| Additional header tagline and generic footer         | Removed; the footer retains the version and preview status.                      |
| “Take the evidence with you”                         | Replaced with “Export reports and import data”.                                  |
| “Coverage comes first”                               | Replaced with “Pages checked”.                                                   |
| Generic introduction in every disclosure             | Removed; the title identifies its actual contents.                               |
| Identical cause caveat on every action               | Explain grouping once; detailed records retain uncertainty about the cause.      |
| Repeated demand/topic warnings on every content card | Give instructions once for the view; page notes retain evidence and limitations. |
| Extracted word lists presented as prose              | Keep the words in page notes rather than presenting them as a summary.           |
| “1 affected URLs” and empty “Rows 1–0”               | Use correct singular/plural and “No rows”.                                       |
| Rule identifiers as human HTML report labels         | Show readable titles; technical records retain stable identifiers.               |

Keep information that changes a decision: crawling permission, missing observations,
partial coverage, export privacy and the age of saved evidence. Removing filler
must not turn uncertainty into a confident claim. Historical analyses retain their
original wording; reanalysis creates a new record without altering the original.

## MCP assessment

**Suitable for supervised local testing; not ready for a stable public release or
unattended production use.** A limited alpha need not implement every future SEO
feature, but it must have reliable lifecycle behaviour, tested host setup and honest
capability limits.

The local stdio server exposes ten scoped tools, validates input and bounds output.
It uses the shared crawler and operator-owned network permissions, with no arbitrary
shell, SQL or browser-script tool. Official SDK tests exercise negotiation, invalid
input, pagination, evidence resources, disconnect/reconnect and interrupted worker
recovery. Packaging checks install the locked archive outside the source tree.

The review reproduced an incorrect complete status when requested browser checks
were blocked. The shared crawler now marks unavailable requested browser checks or
incomplete sitemaps as partial. Tests cover status, coverage and the incomplete gate
result. Unsampled pages in automatic mode remain distinct from failed requests.

## Earlier alpha-review recommendations

The earlier DNS blocker is repaired. The shared network policy now bounds lookup
waits and responds to cancellation. Crawl deadlines include lookup and HTTP time;
resuming preserves the original elapsed-time budget. Provider calls pass cancellation
through address selection. Late answers cannot start a connection. The operating
system lookup may continue internally after this application stops waiting.

The installed-server test also caught a silent CLI exit through a symlinked launch
path. Entry-point comparison now uses the real filesystem path. The regression
launches the clean-installed MCP through a symlink with spaces and a hash character.

1. Test the compiled, installed server in supported MCP hosts. SDK client tests do
   not prove Codex or another host’s startup environment, discovery, permissions,
   reconnection or handling of large reports and resources. Record exact host and
   runtime combinations with setup instructions.
2. Perform an independent security review and a small independently reviewed SEO
   defect/counterexample corpus. Existing tests verify particular cases; they do
   not certify all crawler boundaries, prompt-injection behaviour or SEO accuracy.
3. Define supported platforms and review installation, versioning, dependency/browser
   licence notices and archive contents. Obtain authorization before publication.

Native Windows/Linux installation, live provider access, live model advice and
external-host behaviour remain unverified. Mark those options as experimental
rather than implying that local structural checks verified them.

The stdio adapter is not an operating-system sandbox. The official MCP security
policy explains that a server has the privileges of its execution environment.
Use a reviewed build, a separate private data directory and restricted execution
where the host supports it.

Sources reviewed:

- [Official MCP security policy](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/SECURITY.md)
- [Official MCP security guidance](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
- [Executed checks and limitations](verification.md)
- [Publication requirements](releases.md)

## Subsequent stable-release work

The user chose to hold publication for a broader stable release. The early storage stop
is repaired, with per-audit accounting, independent download limits, lossless findings,
historical migrations and readable stop explanations in the interface and reports.
The 10,000-page synthetic HTTP benchmark now retains its analysis. Separate Inspector
and actual Codex connection/resource checks have also run; interactive model workflows
remain unverified. Cross-platform CI is prepared but has not executed remotely.
A Linux arm64 container clean installation and CLI demo succeeded. These checks narrow
the remaining release work; they do not replace live integrations, native platform
checks or independent security/SEO review. Details and limits are in verification.md.


## Public testing preview review — 2026-10-12

The maintainer now requests reviewed source for public testing, followed by a stop.
The [public testing plan](public-testing-plan.md) records that finish line; the
stable-release backlog remains open. Earlier host and independent-review
recommendations above remain important follow-up work, with their unverified status
visible to testers. They are not represented as passed by local SDK tests.

The new tester guide explains the fictional demo, archive/source setup, optional
Chromium and MCP checks, partial coverage and private feedback. Current copy removes
obsolete capability claims about reference graphs and independent review, and
labels the old container checkpoint as historical. New retry and timeout messages
explain the actual stop and the next useful action. No slogans, captured-site text
changes, automatic publication or unsupported quality certification are introduced.

Final local verification and archive review are recorded in the testing plan and
verification ledger after execution. Rendered/keyboard checks come from the selected
browser suite; textual review does not certify assistive technology or reader
preferences.
