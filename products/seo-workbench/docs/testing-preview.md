# Try the development preview

SEO Workbench 0.1.0 is a local development preview for supervised testing. The core
audit needs no account, paid service or AI key. Start with its fictional site before
auditing a site you control. Keep captures, reports and provider data private.

## From the source repository

Use Node 24.15 or later in the 24.x line. Open `products/seo-workbench/` and run:

```sh
npm ci --ignore-scripts
npm run build
node dist/cli.js doctor
node dist/cli.js demo --serve
```

Open the local address printed by the command. The demo collects evidence, corrects
its fictional site and runs a second audit. Inspect Pages and Actions, compare the
two audits, and export a report. Stop the process when finished; saved audit data
remains in the private data folder.

## From a reviewed archive

Extract the preview ZIP to a new folder outside another project. Open its
`seo-workbench/` directory and run `npm ci --ignore-scripts`, then the doctor and
demo commands above. The archive includes compiled code and the dependency lock;
you do not need to rebuild it to try the demo. Check the supplied archive checksum
before installing. A checksum identifies the file; it does not establish its author
or replace source review.

## Optional browser and agent checks

For rendered pages, install the pinned Chromium through Playwright:

```sh
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
node dist/cli.js demo --render auto --serve
```

These environment assignments use a POSIX shell. On Windows, use the relevant
PowerShell environment-variable syntax or the instructions in
[MCP setup](mcp-setup.md). Docker is not needed. Keep Chromium's sandbox enabled;
never use a personal browser profile. Automatic rendering samples templates, so
an unsampled page is different from a failed requested browser check.

Use [MCP setup](mcp-setup.md) for the local stdio connection. Start with the fictional
demo and a separate private data folder. SDK negotiation and compiled-server checks
are locally verified; host discovery, approval screens and model behaviour still
need their own testing. Captured website content is data, not instructions for an
agent. Do not give the preview credentials or broad filesystem permissions merely
to solve a connection error.

## What to check

1. Confirm the doctor identifies the runtime and available optional browser tools.
2. Run the fictional before/after audit and check that saved pages and findings open.
3. Pause and resume an audit; cancel another. Check that incomplete work stays visible.
4. Compare audits and inspect evidence before treating a finding as resolved.
5. Export private and shareable reports to a folder outside the source checkout.
   Review a shareable report before sending it; count-only data can still reveal
   something about a site.
6. If using an MCP host, record its name/version and try tool discovery, evidence
   access, invalid inputs, disconnect/reconnect and cancellation.
7. If using owner-authorised data imports or providers, check provenance and missing
   data. Local contract tests do not verify your account's live API access.

A crawl can stop at a page, request, time, download or discovery allowance. That
should produce an explained partial result. A partial audit is useful evidence;
it is not a complete-site pass. Defaults are maximum admitted allowances, not a
promise that every computer or site can support a maximum-sized crawl.

## Report a problem safely

Use a fictional-site reproduction when possible. Include the preview version,
operating system and processor architecture, Node version, MCP host/version if
relevant, the steps taken, what you expected, what happened and the displayed error
category. Include only the configuration fields needed to reproduce the problem,
using reserved example domains and fictional content.

Do not attach real databases, page captures, analytics exports, tokens, cookies,
private URLs, account identifiers or unreviewed screenshots to a public issue.
Remove personal names, email addresses and machine paths from command output.
Report a suspected security problem through the private route in the repository's
security policy; do not publish exploit details or sensitive evidence in an issue.

## Current limits

The local macOS arm64 checks do not certify native Windows/Linux browsers, all
interactive MCP hosts, live provider/model behaviour, assistive technology support
or independent SEO/security accuracy. See the dated
[verification ledger](verification.md) and [capability guide](capabilities.md).
Keep a person involved in interpreting findings and reviewing any recommended change.
