# 🌩️ Google Cloud

- [Install the `gcloud` CLI](https://cloud.google.com/sdk/docs/install#installation_instructions)

Useful commands:

```bash
gcloud auth login
gcloud auth list
```

## Setup

```bash
gcloud auth configure-docker us-west2-docker.pkg.dev

docker tag rocketcms:production \
  us-west2-docker.pkg.dev/rocketcms/monorepo/rocketcms:production

docker push us-west2-docker.pkg.dev/rocketcms/monorepo/rocketcms:production

# Digital Ocean
docker tag rocketcms:production \
  registry.digitalocean.com/rocketcms/monorepo/rocketcms:production

docker push registry.digitalocean.com/rocketcms/monorepo/rocketcms:production
```

Lorem ipsum dolor sit amet consectetur adipisicing elit. Laboriosam sit quisquam error exercitationem expedita consectetur explicabo enim deserunt itaque commodi facilis atque quae inventore fugiat quidem, officiis ut. Veritatis, voluptates?

```bash
# Digital Ocean CLI
brew install doctl
```
