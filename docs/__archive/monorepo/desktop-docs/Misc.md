# 🌎 Domains

We currently have two TLD's that we're managing, **haldi.com** and **haldiskin.com**. From what I understand the preferred domain is **haldi.com** and we've somewhat recently acquired it.

## Redirect top-level-domains

- `*.haldiskin.com` -> `*.haldi.com`
  - Better for SEO to have one domain
  - Better for our users as its simple

## Use ".dev" exclusively for testing

- `admin.haldiskin.dev`
  - Uses `staging` database
- `admin.preview.haldiskin.dev`
  - Uses `production` database

## 🙈 Environment Variables

NextJS has improved its overall support and now supports updating variables within their UI. See [the docs](https://vercel.com/docs/environment-variables) for more info.

> 👀 ⚠️ 👀
>
> Next.js will replace `process.env.customKey` with 'my-value' at build time. Trying to destructure process.env variables **won't work** due to the nature of webpack DefinePlugin.
>
> ⚠️ ⏰ ⚠️

## Naming Convention

The `name` of the service will be used as a suffix to all values, followed by the `actor` and `description` or key.

```bash
# Examples from the "Survey App"
SURVEY_ALGOLIA_APP_ID="XXXXXXXXX"
SURVEY_ALGOLIA_API_KEY="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
SURVEY_FIREBASE_ENV="staging"
SURVEY_WEBAPP_URL="http://localhost:8000"
```

## System Environment Variables

We currently host this application on Vercel which exposes some "[system-environment-variables](https://vercel.com/docs/environment-variables#system-environment-variables)" which we make use of.

```tsx
// Vercel deployment(s) only
const VERCEL_GIT_COMMIT_REF = process.env NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF;
const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV;
const VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL;
```
