# Verify Google data access locally

Use a Search Console property you are authorised to access. A crawler can inspect a
public website without signing in, but Search Console data needs separate API access.
Do not use an unrelated test site for this step. Keep credentials, returned data and
verification logs outside the repository.

## Read-only Search Console access

The current adapter accepts a short-lived OAuth access token. It does not perform
OAuth login or store refresh tokens. Obtain a token through your existing approved
OAuth application or Google’s OAuth Playground. Request only this scope:

```text
https://www.googleapis.com/auth/webmasters.readonly
```

If you are setting up your own OAuth application, enable the Search Console API in
your Google project and configure its client and consent screen following Google’s
instructions. Do not add those client credentials to this source tree. In the official
Playground, keep Google’s endpoints selected, enter the read-only scope, choose
Authorize APIs, review the consent screen, and exchange the code for tokens. Review
any organisation restrictions before granting access. Copy only the short-lived access
token into your local terminal; do not share a Playground link containing credentials.

For a temporary test in a macOS zsh terminal, this reads the token without echoing it
or placing its value in the command history:

```sh
read -rs 'SEO_WORKBENCH_GSC_TOKEN?Paste the short-lived access token: '
export SEO_WORKBENCH_GSC_TOKEN
```

Run the next commands in that same terminal. The application receives the value from
the environment; its command line contains only the variable name. A separately
running agent or workbench process does not automatically inherit this variable.
Never paste a token into chat, an issue or a command argument.

## Select a project and date range

Create a Workbench project for your authorised website and obtain its project ID with
`node dist/cli.js projects`. Use the same external data directory for the project and
provider calls. The example below uses a fictional UUID and property; replace them
locally. Choose a completed date range with enough activity to check the returned rows.

```sh
node dist/cli.js search-console 00000000-0000-4000-8000-000000000001 --property https://www.example.com/ --start-date 2026-09-01 --end-date 2026-09-30 --credential-env SEO_WORKBENCH_GSC_TOKEN --authorize-transfer --data /path/to/private-audit-data
```

Use the exact property identifier registered in Search Console. Domain properties
use the form `sc-domain:example.com`; URL-prefix properties include their scheme and
trailing slash. Returned page origins must belong to the Workbench project. A property
covering additional origins needs a correspondingly authorised project scope; rejected
rows must not be relabelled or silently accepted.

Check the import’s dates, dimensions, returned rows and provider provenance in the
workbench. Search Analytics returns selected top rows, not every query or a complete
market inventory. Zero rows do not establish that the site has no search demand.

For one page’s indexed snapshot, use `inspect-index` with the same token, project,
property and an authorised page URL. This is a saved Google index observation; it
is not a live crawl or a guarantee that every indexed page is known.

## Performance measurements

Search Console tokens do not substitute for a CrUX API key. CrUX setup requires the
corresponding enabled API and a locally configured key. PageSpeed Insights may accept
an unauthenticated request where Google permits it, or a configured API key. Both send
the target URL to Google; obtain permission for that transfer before calling them.
Never transfer a target that the user limited to local testing.

Run one authorised URL first. Check that field measurements keep their collection
window and URL/origin scope, and that remote Lighthouse results remain labelled lab
measurements. Missing field data is unavailable, not good performance. Repeat only
within the approved quota and requested test scope.

## Finish the verification

Check successful results and the handled categories for unavailable access, expired
credentials, quota refusal and timeout. Do not deliberately consume a quota to test
its limit. Record only a sanitised outcome summary in repository documentation; retain
provider inputs and raw responses privately. Remove the temporary token from the
terminal with `unset SEO_WORKBENCH_GSC_TOKEN`, and revoke test access where appropriate.
Live success does not replace the synthetic failure/cancellation regression tests.

Sources reviewed on 2026-10-11:

- [Search Console API authorisation](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing)
- [Google OAuth Playground](https://developers.google.com/oauthplayground/)
- [PageSpeed Insights API setup](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Adapter scope and commands](integrations.md)
