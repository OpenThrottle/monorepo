# Checkout (Stripe flow)

This folder contains UI and routing logic for the Stripe checkout flow on openthrottle-website: main checkout, success, and cancel routes and their components.

## Server-side follow-up (out of scope here)

Server-side Stripe work lives in **openthrottle-server** and is tracked separately. When implementing it, create a dedicated plan (e.g. in OpenThrottle) or a GitHub issue for:

- **Checkout session**: Create Stripe Checkout Session and return URL/session ID to the website.
- **Webhooks**: Handle Stripe webhook events (e.g. `checkout.session.completed`, payment success/failure).
- **Environment**: Document and use `STRIPE_*` (and any other required) env vars in openthrottle-server.

The website routes and components in this folder assume the server will provide the session-creation endpoint and webhook handling.
