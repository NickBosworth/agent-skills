# Measure page speed locally

The optional local runner uses Lighthouse 13.5.0, Puppeteer Core 25.13.0 and the
locally installed Playwright Chromium, with its sandbox enabled. Ordinary audits do not need
these measurement packages, a model or an account. No measurement is sent to Google or another
measurement provider. The host contacts the selected website to fetch the page and
permitted resources.

Install Chromium using [the renderer setup](rendering.md). The same setup documents
local sandboxing, resource permissions and observation limits.

```sh
node dist/cli.js lighthouse PROJECT_ID https://www.example.com/guide \
  --device mobile --repeats 5 \
  --data /path/to/private-audit-data
```

Replace the project and data placeholders with your own reviewed values.
The page must be inside the project's approved crawl scope. Mobile is the default;
choose desktop to run its separate Lighthouse profile. Five repeat runs are the
default and maximum. Each run starts a fresh browser; fewer repeats are useful for
initial diagnosis. The original request, byte, time and request-pacing limits still
apply across the whole series. A larger repeat allowance would encourage long
synchronous requests without establishing representative visitor performance.

In **Export & imports**, use **Measure page speed locally**. Keep the tab open and
use **Cancel speed test** to stop. The same operation is available through
`Workbench.measurePerformance`, authenticated `POST /api/performance` and the MCP
`measure_performance` tool. These interfaces cannot choose a browser executable or grant private
network access. The operator supplies those permissions when the process starts.
For five repeats, configure an MCP tool timeout of at least 180 seconds; a shorter
host timeout needs fewer repeats. A cancelled request releases the worker slot.

A speed test reserves the same worker slot as crawling. Queued or active crawls
prevent it from starting, and other clients cannot start a crawl while it runs.
The runner checks robots rules for the page and every requested resource, including
approved redirect hops. Unavailable or restrictive crawl policies prevent the
measurement. This conservative policy can make a page unmeasurable when an asset's
origin forbids collection; do not bypass that restriction to obtain a score.

A successful series saves every run, its browser and emulation profile, the local
browser mode, and median/minimum/maximum for Largest Contentful Paint (LCP),
Cumulative Layout Shift (CLS) and Total Blocking Time (TBT). LCP describes when the
largest content element appears. CLS measures unexpected layout movement. TBT
summarises blocking work during this navigation test. Interaction to Next Paint
(INP) remains unavailable: a navigation lab test cannot supply real-visitor INP.
No aggregate SEO score or ranking prediction is produced.

Local runs share this computer's processing and memory, so other work affects results.
Lighthouse uses provided throttling. The host broker buffers responses and
respects request pacing. An initial page
request warms the server before the repeat series. Mobile emulation changes the
browser profile; it does not reproduce a particular phone, mobile network or visitor.
These conditions affect timing. Compare runs only when the browser mode/version, profile, project
settings and surrounding workload are comparable. Repeat variability does not
establish what caused a change. CrUX reporting windows and percentiles remain a
separate real-visitor source.

Missing metrics, blocked requests, resource failures or an interrupted repeat reject
the whole series. A missing favicon alone is not a failed content resource. A save
failure rolls back all records in that series. Private series records are readable
through `audit_results` with `view: "local-lab-series"` and private reports. Shareable
reports omit measurements, page addresses and series records. Project deletion
removes these project-level imports; deleting one crawl retains them. Saved series
contain private website addresses and must stay outside the source repository.

This implementation follows the official [Lighthouse Node workflow](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md),
[Lighthouse integration with Puppeteer](https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/docs/puppeteer.md)
and [Puppeteer launch options](https://pptr.dev/api/puppeteer.launchoptions).
Browser control uses a pipe rather than a listening debugging endpoint. Page requests
use the host broker. The local browser does not provide a separate operating-system egress boundary.
The complete release still needs the broader platform, security and human acceptance
recorded in the production-readiness plan.

Leaving the speed-test view or choosing Cancel aborts its active HTTP request. The
server releases measurement ownership and saves no partial series. Closing the tab
uses the same connection-abandonment path. If a complete series was already saved
before cancellation arrived, cancellation does not delete that completed record.
