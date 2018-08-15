# responsive-check

Make screenshots for different device viewports and see them on one page with the server.

The example configs tests the built-in server index.html. You find usage info there.

## Run gulp docker image

Run a container from the image `uwegerdes/responsive-check` and connect to your environment (with the localhost ports of responsive-check on 5381, gulp livereload on 5382 and a running webserver docker container, the hostname `webserver` is used in test configs).

```bash
$ docker build -t uwegerdes/responsive-check .
$ docker run -it \
	--name responsive-check \
	-v $(pwd)/config:/home/node/app/config \
	-p 5381:8080 \
	-p 5382:8081 \
	uwegerdes/responsive-check
```

Open `http://localhost:5381/` or the ip shown in the console output in your favourite browser.

Stop the container with CTRL-C.

Restart the container with

```bash
$ docker start -ai responsive-check
```

## Develop

```bash
$ docker run -it \
	--name responsive-check-dev \
	-v $(pwd):/home/node/app \
	-p 5383:8080 \
	-p 5384:8081 \
	uwegerdes/responsive-check bash
```

On first start phantomjs is installed (installation in Dockerfile always fails - dunno why) and copied as sudo - enter node password.

Run `gulp`. Open the responsive-check server url in your browser.

## Inspect

To connect to a running container use:

```bash
$ docker exec -it responsive-check bash
```

## Use on Raspberry Pi 3

I've tried to use this docker on my Raspberry Pi 3 with `uwegerdes/docker-baseimage-arm32v7` and `uwegerdes/docker-nodejs` (checkout and build them before building this Dockerfile).

Sadly there is no arm32v7 version of Phantomjs. Use `uwegerdes/docker-build-phantomjs-arm32v7` to create the phantomjs bin. It must be copied to `./build/phantomjs/bin/phantomjs` before building with:

```bash
$ docker build -t uwegerdes/responsive-check -f Dockerfile.arm32v7 .
```

## CHANGELOG

1.8.6: use firefox-esr and slimerjs v0.10

1.8.5: refactoring other files

1.8.4: refactoring index.js

1.8.3: show running test in layered iframe on page

1.8.2: refactoring gulpfile.js

1.8.1: updated packages

1.8.0: updated to NodeJS 8.11.x, added Dockerfile

1.7.0: project extracted from frontend-development
