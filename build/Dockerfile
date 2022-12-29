# syntax=docker/dockerfile:1

FROM node:19-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN apk update && apk add git
ADD CONFIGURATION.md .
ADD DEVELOPING.md .
ADD README.md .
ADD audio audio
ADD bin bin
ADD css css
ADD dictionaries/*.dict dictionaries/
ADD dist dist
ADD editions editions
ADD favicon.ico .
ADD games games
ADD html html
ADD i18n i18n
ADD images images
ADD package.json .
ADD src src
RUN npm install || cat /root/.npm/_logs/*.log
EXPOSE 9093
CMD [ "npm", "run", "server" ]
