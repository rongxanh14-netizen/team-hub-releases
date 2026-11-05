# Team Hub Web 1.5.4

Read-only web adaptation of Team Hub 1.5.4. Production: https://team-hub-dashboard-phi.vercel.app

## Automatic deployment
Connect rongxanh14-netizen/team-hub-releases to Vercel, production branch main, Root Directory web, framework Other, default build/output settings. Commits updating web trigger production deployments. Publishing a desktop release alone does not update these web files; update web alongside each compatible release.

Keep existing server-side environment variables: JIRA_EMAIL, JIRA_API_TOKEN, TEAM_HUB_CONFIG, optional TEAM_HUB_CAMPAIGNS. Never commit their values. Jira writes are blocked by the route allowlist and transport guard.

## Performance
Static assets use Vercel CDN. API function region: Singapore (sin1). Successful shared reads use bounded memory and CDN caching for 60 seconds. Memory hits pass only the remaining cache lifetime to CDN. Equivalent concurrent requests share one load; errors are not cached. Search results seed parent lookups; enrichment resolves six distinct parents concurrently. Metadata caches last one hour; parent/Epic metadata lasts 30 minutes, bounded to 1500 entries per map.

Visible tabs sync every minute with a 30-second scheduler tick and failure backoff. Hidden tabs pause polling and check on return. Manual refresh may reuse results less than 60 seconds old. Jira search indexing and browser/server scheduling can add delay. Planner charts and Epic catalog use read-only endpoints.

## Validation
Run npm ci and npm test. Tests use synthetic Jira responses and cover coalescing, cache expiry, Planner query isolation, denied writes and secret omission.
