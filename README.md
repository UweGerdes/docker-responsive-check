# responsive-check

Make screenshots for different device viewports and see them on one page with the server.

The example configs tests use my frontend-development sample application where a user can create an account, confirm, login, modify and delete the account.

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
	-p 5481:8080 \
	-p 5482:8081 \
	uwegerdes/responsive-check bash
```

Run `gulp`.

## Inspect

To connect to a running container use:

```bash
$ docker exec -it responsive-check bash
```
