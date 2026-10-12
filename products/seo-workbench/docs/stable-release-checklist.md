# Stable release acceptance

Source and release publication are on hold at the user’s request. The user will
perform live integration tests separately. This checklist records the work still
needed for a stable release; it does not list completed certifications. Keep the full
product backlog in TASK-0002; a first release does not make deferred features complete.

## Platform installation and private storage

- Run the prepared Windows, Linux and macOS CI jobs against the reviewed source.
  Verify locked clean installation, compiled startup, detached workers, crash recovery,
  migrated histories and stdio MCP in paths with spaces and a hash character.
- On Windows, verify the actual access controls on the data directory, database and
  temporary exports. POSIX mode numbers do not establish Windows privacy. Repair any
  gap and add a native regression before claiming supported private storage.
- Record exact tested OS/runtime combinations and failures. The local Linux arm64
  container doctor and synthetic demo have passed; this is not native Windows evidence.
- Verify native sandboxed Chromium and Lighthouse on each advertised platform.
  Record unavailable browser checks separately from HTTP and MCP acceptance.

## Browser dependencies

Review the locked Node dependency advisories and notices, the independently installed
Playwright Chromium version and applicable browser-engine advisories. Keep sandboxing
enabled. Verify clean installs and browser cancellation/host-loss behaviour on each
advertised platform. No container build or image-distribution gate is part of this
product. The current local dependency inventory is not independent security or legal
clearance.

## Interactive MCP hosts

Use original synthetic data in an actual supported host. Confirm discovery, approval
of a scoped audit, status polling, pagination, page inspection, resource reads, report
size limits, cancellation and reconnection. Check a site-supplied instruction cannot
change network permissions, invoke a shell or replace the user’s request. A protocol
client checks server contracts; it does not establish model resistance to injection.

Codex app-server discovery/resource reads and Inspector projects calls have passed.
Interactive host approval and model behaviour remain unverified. A host can send tool
results and captured evidence to its model provider; review that host’s data handling
before using real captures. Do not use private website content for acceptance tests.

## Live integrations

Configure supported access locally with explicit consent. Never paste credentials or
account identifiers into source, public logs or an issue. Keep imported/provider data
outside the checkout. Test one authorised service at a time: success, unsupported
capability, expiry, quota refusal, timeout, cancellation, provenance and actual resource
accounting. Use original synthetic evidence for local model advice evaluations.

Mocked Search Console, URL Inspection, CrUX, PageSpeed and Ollama contracts have passed.
No configured live provider or local model was available for this execution. The user chose to proceed with the local build and perform live integration testing separately. Record
live checks separately; mocks cannot satisfy this gate. No paid request or account
transfer is authorised merely by preparing this checklist.

## Security and SEO review

Review the connection boundary, redirects/robots, private-state lifecycle, rendering
broker, report escaping, stored encodings and migration failures. Include a separate
review of true defects, legitimate counterexamples and unavailable evidence for each
supported rule family. Evaluate recommendation usefulness and harmful advice; do not
substitute test counts for precision or independent review. Resolve material findings
and record the exact reviewed revision without private reproduction data.

## Final candidate and publication

Run product and root gates, scan the actual candidate plus all reachable history,
inspect archive contents and notices, and update version/migration/capability records.
Build the reviewed ZIP twice and compare hashes. Clean-install the final artifact,
not an earlier archive. Record unavailable checks and scope exclusions accurately.

Obtain applicable authorization before publishing source, running public CI or
creating a release. Public CI and a source push are publication too.
Use anonymous Git metadata and the repository’s staged/history/privacy gates. No job
in this repository automatically publishes a Workbench release.
