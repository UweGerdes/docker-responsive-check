# responsive-check

Make screenshots for different device viewports and see them on one page with the server.

The example configs tests use my frontend-development sample application where a user can create an account, confirm, login, modify and delete the account.

## Run gulp docker image

Run a container from the image `uwegerdes/responsive-check` and connect to your environment (with the localhost ports of responsive-check on 5381, gulp livereload on 5382 and a running webserver docker container, the hostname `webserver` is used in test configs).

```bash
$ docker build -t uwegerdes/responsive-check .
$ docker run -it \
	--name responsive-check-webserver \
	-v $(pwd)/config:/home/node/app/config \
	-p 5381:8080 \
	-p 5382:35729 \
	--network="$(docker inspect --format='{{.HostConfig.NetworkMode}}' webserver)" \
	--add-host webserver:$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' webserver) \
	uwegerdes/responsive-check
```

Open `http://localhost:5381/` in your favourite browser.

Stop the container with CTRL-C and exit the container with CTRL-D.

## Self test

```bash
$ docker run -it \
	--name responsive-check \
	-v $(pwd):/home/node/app \
	-p 5481:8080 \
	-p 5482:35729 \
	uwegerdes/responsive-check bash
```

Run `gulp`and open `http://localhost:5481/` in your favourite browser and open the app page, execute `default` and see the results.

Stop the container with CTRL-C and exit the container with CTRL-D.

## Develop

```bash
$ docker start -it responsive-check
```

Run `gulp`.

## Inspect

To connect to a running container use:

```bash
$ docker exec -it responsive-check bash
```
