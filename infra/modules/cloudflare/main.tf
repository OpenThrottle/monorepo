provider "cloudflare" {
  # The previous authorization scheme for interacting with the Cloudflare API. When possible, use API tokens instead of Global API keys.
  api_key = "***REMOVED-CF-API-KEY***" # or set CLOUDFLARE_API_KEY env variable

  # The preferred authorization scheme for interacting with the Cloudflare API. [Create a token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).
  api_token = "***REMOVED-CF-API-TOKEN***" # or set CLOUDFLARE_API_TOKEN env variable

  # Used when interacting with the Origin CA certificates API. [View/change your key](https://developers.cloudflare.com/fundamentals/api/get-started/ca-keys/#viewchange-your-origin-ca-keys).
  api_user_service_key = "***REMOVED-CLOUDFLARE-ORIGIN-CA-KEY***" # or set CLOUDFLARE_API_USER_SERVICE_KEY env variable

  # The previous authorization scheme for interacting with the Cloudflare API, used in conjunction with a Global API key.
  email = "user@example.com" # or set CLOUDFLARE_EMAIL env variable
}

# Configure a resource
resource "cloudflare_zone" "example_zone" {
  account = {
    id = "023e105f4ecef8ad9ca31a8372d0c353"
  }
  name = "example.com"
  type = "full"
}
