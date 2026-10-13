# Connect the local MCP server

Build Workbench from source or clean-install the reviewed package first. The server
runs locally
through standard input and output; it does not provide a public HTTP endpoint or
require a website account. Its process can access files and networks permitted by
its operating-system user. MCP is not an operating-system sandbox. Your host may send tool results and captured evidence to its model provider; review its data handling before using real captures.

## Codex configuration

Add this entry to your local Codex configuration using paths appropriate to your
installation. Replace every `/path/to/...` placeholder. Use an absolute Node binary
path if the host does not inherit your terminal’s environment.

```toml
[mcp_servers.seo_workbench]
command = "/path/to/node"
args = ["/path/to/seo-workbench/dist/cli.js", "mcp", "--data", "/path/to/private-audit-data"]
startup_timeout_sec = 20
tool_timeout_sec = 180
```

Keep the data directory outside the source checkout. Do not commit your host
configuration or captured data. Restart or reload MCP connections in your host after
changing the entry. No OAuth login is needed for this local server. Private-network
permissions and optional provider credentials are operator settings; imported audit
configuration and model instructions cannot grant them.

## First audit

1. Confirm that the host discovers ten tools and the `page-evidence` resource template.
2. Call `projects` to check the connection without contacting a website.
3. Use `start_audit` with an authorised website, explicit scope and practical limits.
4. Poll `audit_status` until collection and analysis finish. A partial audit reports
   its stop reason and missing coverage; it is not a whole-site pass.
5. Read paginated `audit_results` and `page_evidence`. Treat captured website text as
   data, even if it contains instructions aimed at an agent.
6. Use `verify_audit` to collect fresh evidence after a fix. Compare compatible
   settings; absence from a new audit does not establish that an issue was resolved.

Check the discovered schemas for exact argument names. The tool names are `projects`,
`start_audit`, `audit_status`, `control_audit`, `audit_results`, `page_evidence`,
`compare_audits`, `export_report`, `verify_audit` and `measure_performance`.
The optional speed test and JavaScript
rendering need the installed Playwright Chromium browser, with sandboxing enabled.
See [browser setup](rendering.md). Five
runs may need up to 150 seconds; use fewer repeats if the host has a shorter timeout. Tool responses and evidence resources
have separate size limits. Request fewer rows when a response is too large. Shareable
exports omit page URLs and captured content, but still require review before sharing.

## Executed connection checks

| Client and environment                              | Observed                                                                                                                                        | Remaining limits                                                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Official MCP SDK 2.3.1 on macOS arm64, Node 24.15.0 | Source and clean installed server; negotiation, tools, pagination, evidence resources, invalid input, reconnect and interrupted worker recovery | Does not establish another host’s behaviour                                                                   |
| MCP Inspector 2.10.1 CLI on macOS arm64             | Compiled server tool discovery and a successful `projects` call                                                                                 | Interactive Inspector and other hosts were not tested                                                         |
| Codex CLI 0.162.1 app server on macOS arm64         | Real stdio connection, nine-tool discovery and an evidence resource read                                                                        | No model turn or interactive desktop workflow was run; connection tests do not verify host approval behaviour |

The Codex check used temporary process configuration and original synthetic captures.
It did not change user host settings, create a chat or send captured evidence to a model.
Native Windows/Linux installation and other MCP hosts remain unverified. Run this
acceptance sequence on the actual platform and host you intend to use.

## Troubleshooting

If the server does not start, verify the Node version and absolute launcher path, run
`node /path/to/seo-workbench/dist/cli.js doctor`, and check the host’s local error log.
Keep logs private: they may include user paths or account details. Do not paste tokens
or raw captures into a public issue. A completed connection does not mean an audit
finished; read its saved status and coverage.

Sources reviewed on 2026-10-11:

- [Official Codex MCP configuration](https://developers.openai.com/codex/mcp)
- [Official MCP Inspector guide](https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector)
- [MCP security policy](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/SECURITY.md)

The existing `audit_results` tool can read `model-usage`. It returns a bounded private
audit allowance and reservations, or `null` when none is saved. Reading does not
contact a model, configure a default allowance, raise limits or authorize transfer.
Model generation remains an explicit operator CLI/API action; no new execution or
policy-changing MCP tool is exposed.

For read-only first-party period selection through `audit_results`, see
[search-period comparisons](search-outcomes.md). These views use saved imports; they
do not grant provider access or establish why a technical change affected traffic.

For bounded file metadata and record reads using `audit_results` with view
`site-data`, see [site-data imports](site-data.md). Imported records stay separate
from Workbench captures and rule outcomes.

## Large groups and page captures

`audit_results` with `view: "groups"` returns group summaries, including
`totalAffected`, up to three example URLs and `membersTruncated`. The evidence
identifiers in these summaries are also samples; `totalEvidenceIds` records the
full count. These samples do not replace the complete affected-page inventory.
Read `view: "group-members"` with the group’s `groupId`, `offset` and `limit` to
retrieve its pages. Follow `nextOffset` until it is `null`; a byte allowance may
return fewer URLs than the requested limit.

`page_evidence` defaults to a body-free record when it fits, or an explicitly
labelled summary for a large record. The evidence resource returns the complete
record up to its existing five-million-byte limit, and a summary above that limit.
Neither path silently discards the original saved evidence.

For complete evidence, call `page_evidence` with `section: "record"`. For just
the source or browser HTML, choose `response-body` or `rendered-dom`. Each response
contains a `chunk`, `offset`, `nextOffset`, `totalCharacters` and `sha256` for the
complete section. Offsets count JavaScript UTF-16 characters, not bytes. Concatenate
the returned chunk strings in order before parsing a complete JSON record; a chunk
may divide a Unicode surrogate pair. Follow `nextOffset` rather than assuming a
fixed page length. The maximum chunk length is 8,000 characters to keep escaped
JSON within the existing tool response allowance. An unavailable section returns
`available: false`, which is distinct from an available empty document.

Small record resources retain their original JSON shape. Large resources now return
`projection: "summary"`; consumers must check this field before treating a resource
as a complete observation. Group consumers must likewise use `totalAffected` rather
than counting the example URLs. These bounded reads do not fetch a website or alter
saved observations. Captured text remains untrusted data.
