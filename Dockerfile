# syntax=docker/dockerfile:1
# Multi-stage: build the static bundle, serve with unprivileged nginx.
FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
# make /etc/nginx traversable + readable for arbitrary runAsUser UIDs,
# and dist world-readable (zip-extracted sources keep restrictive modes)
RUN chmod 755 /etc/nginx /etc/nginx/conf.d && chmod 644 /etc/nginx/nginx.conf && chmod -R a+rX /usr/share/nginx/html
USER 65532
# bypass the image entrypoint (its config-templating scripts mutate the FS,
# which breaks under readOnlyRootFilesystem); our config is fully static.
# The shell wrapper pre-creates the temp dirs (nginx mkdirs temp paths
# one level at a time) then execs nginx.
ENTRYPOINT ["/bin/sh", "-c", "mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp /tmp/nginx/fastcgi_temp /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp && exec nginx -g 'daemon off;'"]
EXPOSE 8080
