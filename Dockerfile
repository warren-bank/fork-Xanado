# syntax=docker/dockerfile:1

FROM node:12-alpine
ENV NODE_ENV=production
WORKDIR /app
ADD . .
RUN npm install --production
EXPOSE 9093
CMD [ "npm", "run", "server" ]
