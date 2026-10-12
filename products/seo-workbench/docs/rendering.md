# JavaScript page rendering

HTTP audits and MCP work without a browser. To check pages that depend on JavaScript,
install Playwright Chromium and select `render: "auto"` or `"all"`:

```sh
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
node dist/cli.js audit https://www.example.com/ --render auto --max-pages 100
```

Use an authorised website instead of the example address. The workbench launches
local Chromium with its sandbox enabled and a fresh anonymous session. It does not
use a personal browser profile, cookies, login, consent clicks or form submissions.
If the browser or its sandbox cannot start, the check remains incomplete; sandboxing
is never disabled to make a test pass. No container software, image or daemon is used.

## Requests and observation limits

Page and resource requests use the host broker, with origin, path, address, method,
byte and time checks. Resource origins default to the approved page origins. Use
`renderResources` for additional authorised public resource origins; this does not
expand the page inventory. Blocked resources are recorded. Service workers, page
WebSockets and downloads are blocked. Routing is an application check, not a firewall;
browser background channels are outside intercepted page requests.

The captured initial response is supplied to the browser, keeping the HTTP and DOM
observations comparable. Resource buffering and request pacing affect timing. These
observations do not reproduce Googlebot or real-visitor performance. Readiness uses
the DOM, an optional selector and stable content samples within a deadline. Later
changes, shadow DOM, iframe text and scroll-triggered content may be missing.
Incomplete observations stay explicit rather than becoming empty-feature failures.

Each check launches a fresh browser. Browsers share this computer's CPU and memory;
the Node memory allowance is not a whole-computer resource quota. Cancellation,
audit deadlines and host-pipe closure stop the worker and close its browser. Keep
Chromium updated and use a trusted computer. Exact observed environments, scale
results and remaining acceptance work are recorded in [verification](verification.md).

The launch uses [Playwright's browser options](https://playwright.dev/docs/api/class-browsertype#browser-type-launch)
with `chromiumSandbox: true`. Lighthouse uses Puppeteer's normal sandboxed launch
without sandbox-disabling flags. Browser control and capture exchange use pipes;
no browser debugging port is exposed.
