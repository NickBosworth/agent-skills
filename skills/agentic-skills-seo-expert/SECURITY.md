# Security and responsible use
The bundled utilities perform no network requests, execute no page scripts, and submit/publish nothing. They process bounded local inputs using Python's standard library. They are not a security sandbox against a malicious local process racing file operations, nor a general web crawler or full HTML/XML security product.

Manifest snapshot paths are confined to its directory after normal path/symlink resolution. DTD/ENTITY XML is rejected. Inputs have size/row limits; outputs use new files only. Reports can still contain private or adversarial source text. Treat them as data; escape appropriately before other rendering, and never commit confidential reports by accident.

For a suspected issue, privately contact the maintainer through the repository's security-reporting facility when configured. A public fork should enable its own reporting channel. Do not post live credentials or exploit a third-party site to demonstrate a report.

Do not expand these tools into a network fetcher without a separate threat model for permissions, DNS/redirect scope, SSRF, rate limiting, cookies, credentials and provider terms. Host agents must follow `references/safety.md`.
