FROM node:18-alpine AS build-env
ADD . /app
WORKDIR /app
RUN \
  npm ci && \
  npm run compile && \
  npm ci --omit-dev --ignore-scripts

FROM gcr.io/distroless/nodejs18-debian11
COPY --from=build-env /app/build/src /app/build/src
COPY --from=build-env /app/node_modules /app/node_modules
COPY --from=build-env /app/migrations /app/migrations
WORKDIR /app
CMD ["build/src/index.js"]
