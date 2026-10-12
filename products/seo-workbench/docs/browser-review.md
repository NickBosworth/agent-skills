# Native browser review

On 2026-10-12 a sandboxed local launch reported Chromium 156.0.8078.4 from the
locked Playwright 1.64.0 installation. Collection tests use that executable through
fresh browser sessions and the existing resource broker. The product does not
install a personal browser profile or disable the sandbox.

The review consulted [Playwright browser installation guidance](https://playwright.dev/docs/browsers)
and Google's [6 October desktop security update](https://chromereleases.googleblog.com/2026/10/stable-channel-update-for-desktop_086471744.html).
Google's update identifies stable version 155.0.8059.39/.40 and security fixes.
The installed development build has a different version and release lineage.
Its higher major version cannot prove every stable security fix is present, nor
does a passing Node dependency audit inspect the browser executable for those fixes.

Keep the browser tied to the reviewed Playwright version, revisit upstream release
and security notices before publication, and re-run sandbox, cancellation, host-loss,
resource and profile checks after changes. Independent browser patch assessment
and native platform acceptance remain open. No assertion of vulnerability-free
Chromium or independent security clearance is made.

The private runtime dependency inventory was generated from the installed tree
using npm's CycloneDX SBOM output. The source archive distributes original software
and the attributed vocabulary data; npm dependencies install separately and retain
their package licences/notices. Do not publish the raw local inventory without
reviewing its metadata and paths under the public repository policy.
