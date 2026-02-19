# elitestockoptions
elitestockoptions

## Safer Netlify deploy workflow

This repo is configured to prevent accidental production deploy spam.

- Netlify only runs a production deploy when the latest commit message contains `[deploy]`.
- Normal commits/pushes are skipped by Netlify and do not consume production deploy credits.

### Publish a release (single deploy)

1. Commit your work normally on your branch.
2. Run:

```bash
./scripts/release-main.sh "release note"
```

This creates one empty release commit with `[deploy]` and pushes to `main`, which triggers exactly one production deploy.
