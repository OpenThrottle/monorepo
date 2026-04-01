# 🎯 Tracking

- [Google Analytics](https://analytics.google.com): Where we send and analyze our events
- [Google Tag Manager](https://tagmanager.google.com): Used to configure 3rd party scripts
- [Facebook Business](https://business.facebook.com): Manage ad accounts, Pages, and users
- [Google Ads](https://ads.google.com): Grow your business with Google Ads
- [Shopify Store](https://shop.haldiskin.com/admin): Shopify Storefront
- [🧪 Tag Assistant](https://tagassistant.google.com/)

So it's a rather hefty list of `external` players, but we still have to connect each of our applications to these services as well.

- [Prod - Checkout Settings](https://skinscripts.myshopify.com/admin/settings/checkout)
- [Prod - Sample Order](https://skinscripts.myshopify.com/26977398/orders/466442d8f1cb7974f9e2a661e59b68ad/authenticate?key=def75b3fb7cdd5838934863d045cd039)
- [Shopify Purchase Event](https://www.digitaldarts.com.au/google-ads-conversion-tracking-shopify)

**Client Application:**

The client application is where the user interacts with their store, adding and removing products all the way up until the checkout process when they are redirected to the Shopify store.

- Google Tag Manager
- Google Analytics
- Facebook Business

**Survey Application:**

What's here is very limited, we've essentially taken some old evens that were lightly implemented a while back and exposed them to our Google Analytics instance.

- Google Tag Manger
- Google Analytics
- Facebook Business

**Shopify Store:**

Shopify is where our users ultimately convert and we do this on the shopify domain. So, this is the only place that we can accurately track when a user has completed a purchase.

- Google Tag Manager
- Google Analytics
- Facebook Business

These are two of the important files to call out:

- [src/config/settings_schema.json](https://github.com/haldiskin/shopify/blob/main/src/config/settings_schema.json)
- [src/layout/theme.liquid](https://github.com/haldiskin/shopify/blob/main/src/layout/theme.liquid)

**Facebook:**

- [Pixels](https://business.facebook.com/settings/pixels/412780706505897?business_id=100166365270876)
