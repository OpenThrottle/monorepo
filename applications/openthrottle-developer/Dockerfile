# OpenThrottle developer — multi-stage build from monorepo root.
# Build: docker build -f applications/openthrottle-developer/Dockerfile [--build-arg ...] .
# See docs/openthrottle/docker-image-build-strategy.md.
###########################################################################
#
#     👀 https://pnpm.io/docker using NX for the monorepo build
#
###########################################################################
ARG NODE_VERSION="22"
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app

ARG APP_ENV="production"
ARG APP_NAME="openthrottle-developer"
ARG APP_VERSION="1.0.0"
ARG GITHUB_TOKEN=""
ARG NX_VERSION="22.5.4"
ARG PNPM_VERSION="9.15.4"

ENV NX_DAEMON="false"
ENV APP_ENV="${APP_ENV}"
ENV APP_NAME="${APP_NAME}"
ENV APP_VERSION="${APP_VERSION}"

# Enable pnpm via npm
RUN npm install --global pnpm@${PNPM_VERSION}


RUN groupadd -r appuser && useradd -r -g appuser appuser

################################################################################
# 📦 dependencies
################################################################################
FROM base AS dependencies

ENV GITHUB_TOKEN=${GITHUB_TOKEN}
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY . .

RUN --mount=type=cache,id=pnpm-development,target=/pnpm/store pnpm install --frozen-lockfile

################################################################################
# 🏗️ builder
################################################################################
FROM dependencies AS builder

ENV NODE_ENV="production"
ENV NX_SWC="true"

RUN pnpm dlx nx@${NX_VERSION} run ${APP_NAME}:build
RUN pnpm --filter=${APP_NAME} --prod deploy pruned

################################################################################
# 🏁 production
################################################################################
FROM base AS production
ENV NODE_ENV="production"

COPY --from=builder /app/pruned ./

RUN chown -R appuser:appuser /app
USER appuser

CMD ["pnpm", "start:docker"]
