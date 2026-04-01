# Shopify

We are not on a [Shopify Plus](https://www.shopify.com/plus/pricing) account so we don't get access to customize the `checkout.liquid` template which means we are unable to track any payment related events. However, we get creative and make use of the `Order Status page scripts` to track the `purchase` event.

**Related links:**

- [Shopify - Settings - Checkout](https://haldi-development.myshopify.com/admin/settings/checkout)
- [Shopify Conversion Tracking](https://www.digitaldarts.com.au/google-ads-conversion-tracking-shopify)
- [No checkout.liquid](https://community.shopify.com/c/shopify-design/can-t-find-liquid-file-for-checkout/td-p/750162)
- [Shopify & Google Tag Manager](https://help.shopify.com/en/manual/reports-and-analytics/google-analytics/google-tag-manager)

**TODO:**

- [x] Create Prod + Staging containers
- [ ] Add GTM to Shopify supporting 2 environments
  - Needs to be added in two places, [read more](https://help.shopify.com/en/manual/reports-and-analytics/google-analytics/google-tag-manager#add-google-tag-manager-code-to-your-theme)
    1. `Shopify Store` -> `Online Store` -> `Theme` -> `Edit Code` -> `theme.liquid`
    2. `Shopify Store` -> `Settings` -> `Checkout` -> `Order status page scripts`
- [ ] [Finish Setup](https://skinscripts.myshopify.com/admin/apps/facebook-ads)

## Checklist

- [ ] Set [these settings](https://skinscripts.myshopify.com/admin/themes/32476987435/editor?context=theme&category=gid%3A%2F%2Fshopify%2FOnlineStoreThemeSettingsCategory%2FDevelopment%2BSettings%3Ftheme_id%3D32476987435%26first_setting_id%3Dfacebook_domain_verification) in `Developer Settings` to `Production`
- [ ] Ensure or [checkout settings](https://skinscripts.myshopify.com/admin/settings/checkout) have the required code in `Order status page scripts`

## Facebook

- [x] [Domain Verfication](https://business.facebook.com/settings/owned-domains/1129393224541334?business_id=100166365270876)
  - shop.haldiskin.com, haldiskin.com, haldi.com
