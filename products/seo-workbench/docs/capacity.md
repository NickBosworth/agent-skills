# Audit allowances and report size

New audits use the largest admitted resource allowances. These are stopping limits,
not a promise that every site can be completed at every maximum. The audit stops
when any allowance is exhausted and retains its coverage and available analysis.
Existing audit configurations are preserved; changing limits requires a new audit.

| Setting                                     | Default and maximum |
| ------------------------------------------- | ------------------- |
| Pages fetched                               | 100,000             |
| Discovered URLs                             | 200,000             |
| Requests, including retry/resource requests | 300,000             |
| Link depth                                  | 100,000             |
| Audit time                                  | 24 hours            |
| Individual HTTP response                    | 10 MB               |
| Configured audit memory                     | 2 GiB               |
| Logical saved-data allowance                | 1 GB                |
| Downloaded response bytes                   | 1 GB                |
| HTTP request timeout                        | 60 seconds          |
| Render readiness timeout                    | 30 seconds          |
| Retries                                     | 3                   |

The depth ceiling now matches the page ceiling because the queue and graph traversal
are iterative and the page/discovery limits still apply. A 60-level link chain was
actually exercised; this does not prove a 100,000-level workload. Other upper limits
remain bounded by the current runtime, extraction and storage design. Raising them
further needs complete collection/analysis/export stress tests rather than just larger
validation constants. Inventory input remains limited to 10,000 explicit URLs per
configuration; discovered work has its separate larger allowance.

Crawl delay stays at 500 milliseconds, rendering stays off until selected, and the
viewport stays at 1280 by 800. These describe pacing, browser permission and the
observation profile. Increasing them would not simply increase crawl capacity.
Optional provider consent and spending/transfer limits are separate operator decisions.

Browser downloads and `report ... --out /path/to/report.html` stream all four formats.
JSON and CSV include every result. HTML and Markdown count passed/inapplicable checks
and preserve individual failures, blocked checks and missing evidence. Files remain
private; shareable profiles omit page addresses, passages and project requirements.

String-returning report APIs have a 32 MiB ceiling, or one quarter of the audit memory
allowance if smaller. They return an error instead of an incomplete report. Buffered
finding reads and comparisons still refuse more than one million results. Whole-record
streams can include more records and retain the individual decoded-record guard.
Consumers of iterators must finish successfully before treating output as complete.

Configured memory and logical storage are not whole-process RSS or physical-disk
quotas. Browser processes share the computer's CPU and memory; there is no separate browser resource quota. Filesystem free space,
allocator state, extraction complexity, other programs and concurrency still matter.
Current measurements and unavailable checks are recorded in verification.md. Native
platform, larger full-render, assistive-technology and independent review gates remain
open; these maximum settings do not close the production plan.

Cause-group views and owner review validation use the complete result cursor rather
than a buffered million-record read. Group retention still has its own allowance and
can fail explicitly; streaming is not unlimited memory. Import reads first sum actual
UTF-8 storage bytes for the selected project and kind, then check each record while
reading. They refuse a complete set above one quarter of the project's configured
memory allowance without returning a misleading partial set. They do not delete or
rewrite stored imports. Decoded objects and SQLite/runtime memory are additional costs.

A current 1,000-page full fixture-render audit completed every render and all eight
streamed exports in about nine minutes, with 439 MB sampled Node RSS. A 10k automatic
fixture-render run completed with two template samples; it does not establish 10k
full rendering. Synthetic private/shareable 10k HTML files loaded in one headless
Chromium browser without external requests. That is not long-document usability,
assistive-technology, other-engine, physical print or 100k-page certification.
