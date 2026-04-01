provider "cloudflare" {
  # The previous authorization scheme for interacting with the Cloudflare API. When possible, use API tokens instead of Global API keys.
  api_key = "144c9defac04969c7bfad8efaa8ea194" # or set CLOUDFLARE_API_KEY env variable

  # The preferred authorization scheme for interacting with the Cloudflare API. [Create a token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).
  api_token = "Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY" # or set CLOUDFLARE_API_TOKEN env variable

  # Used when interacting with the Origin CA certificates API. [View/change your key](https://developers.cloudflare.com/fundamentals/api/get-started/ca-keys/#viewchange-your-origin-ca-keys).
  api_user_service_key = "v1.0-144c9defac04969c7bfad8ef-631a41d003a32d25fe878081ef365c49503f7fada600da935e2851a1c7326084b85cbf6429c4b859de8475731dc92a9c329631e6d59e6c73da7b198497172b4cefe071d90d0f5d2719" # or set CLOUDFLARE_API_USER_SERVICE_KEY env variable

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
