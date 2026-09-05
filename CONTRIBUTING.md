# Contributing To NexaERP

## Branch strategy

- main: production-ready code only
- develop: integration branch for upcoming release
- feature/<module>-<short-name>: all new work branches from develop
- fix/<module>-<short-name>: non-urgent bug fixes from develop
- hotfix/<short-name>: urgent production fixes from main

## Pull request flow

1. Create issue first (bug or feature).
2. Branch from develop (or from main for hotfix).
3. Keep PRs focused and small.
4. Link issue in PR and complete checklist.
5. Require at least one reviewer before merge.
6. Squash merge feature and fix branches into develop.
7. Merge develop into main for release.

## Commit message examples

- feat(inventory): add stock transfer endpoint
- fix(sales): prevent duplicate invoice numbers
- chore(ci): add lint check

## Local checks before PR

- Run API locally
- Run web locally
- Validate changed modules manually
- Ensure no secrets or .env values are committed
