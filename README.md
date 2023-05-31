# What we are trying to do here?
We are trying to create a [`sveltekit`](https://kit.svelte.dev/) project and use [`puppeteer`](https://pptr.dev/) to
take screenshots of the pages. Also [`dockerize`](https://www.docker.com/) the project (which is tricky part here) so that it can be
used anywhere with no hassle.

## Below are the step how to do it
1. Create a sveltekit project
```bash
npm create svelte@latest puppeteer-app
cd my-app
npm install
npm run dev -- --open
```

2. Install puppeteer
```bash
npm install puppeteer
```

3. Create a `+server.ts` file in `src/routes/api` folder
```javascript
import puppeteer from 'puppeteer';

export async function GET() {
    /**
     * Reason why we need pass args: ['--no-sandbox'] is because we are running this in docker container
     * https://stackoverflow.com/questions/59087200/google-chrome-failed-to-move-to-new-namespace
     */
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://www.w3schools.com/howto/tryhow_css_example_website.htm');
    const img = await page.screenshot({ path: 'example.png' });
    await browser.close();

    return new Response(img);
}
```

4. Update the adpater to Node from Auto
   1. Update `svelte.config.js` file with '@sveltejs/adapter-auto' to '@sveltejs/adapter-node'
   2. Update `package.json` file with '@sveltejs/adapter-auto' to '@sveltejs/adapter-node' and update the version
   3. Then run `npm install` to install the adapter

5. Create a `Dockerfile` in root folder
```dockerfile
# Below line are used to create ./build folder,
# which is used to copy the build files from the builder stage.
# This is done to reduce the size of the final image.
FROM node:16.19.0-alpine3.16 AS builder
WORKDIR /puppeteer-sveltekit-docker
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm ci --omit dev
############################################################

# Below line are used to create the final image.
# Using lightweight Linux distribution based on Alpine Linux.
FROM alpine
# Installs latest Chromium (100) package.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Puppeteer v13.5.0 works with Chromium 100.
RUN yarn add puppeteer@13.5.0

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
USER pptruser

WORKDIR /puppeteer-sveltekit-docker
COPY --from=builder --chown=pptruser /puppeteer-sveltekit-docker/build ./build
COPY --from=builder --chown=pptruser /puppeteer-sveltekit-docker/node_modules ./node_modules
COPY --chown=pptruser package.json .
CMD ["node","build"]

```

6. Create a `.dockerignore` file in root folder
```
node_modules
Dockerfile
.dockerignore
.gitignore
build
.svelte-kit
```

7. Create a `docker-compose.yml` file in root folder
```yaml
version: "3.8"
services:
  puppeteer-sveltekit-docker:
    image: puppeteer-sveltekit-docker-image:1.0.0
    build:
      context: .
      dockerfile: Dockerfile
      args:
        PORT: 3000
    container_name: puppeteer-sveltekit-docker-container
    ports:
      - "3000:3000/tcp"
```

8. Run `docker-compose up` to build and run the docker container
9. Open `http://localhost:3000/api` to see the screenshot

> Note: Don't forget pass `{ args: ['--no-sandbox'] }` in `puppeteer.launch` function, otherwise it will throw error.
> 
## Intiution behind make this whole thing work
* Everything run fine on local system but when we try to run it in docker container it throws error.
* So to resolve this we need to have same kind of environment like our local system in docker container.
* Therefore, take build base image as `alpine` which is lightweight Linux distribution based on Alpine Linux.
* After that everything will be same like installing `chromium`, `nodejs`, `yarn` etc.
