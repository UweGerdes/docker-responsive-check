#
# Dockerfile for responsive-check
#
# docker build -t uwegerdes/responsive-check .

FROM uwegerdes/nodejs:8.x

MAINTAINER Uwe Gerdes <entwicklung@uwegerdes.de>

ARG RESPONSIVE_CHECK_HTTP='8080'
ARG GULP_LIVERELOAD_PORT='8081'

ENV NODE_ENV development
ENV HOME ${NODE_HOME}
ENV APP_HOME ${NODE_HOME}/app
ENV RESPONSIVE_CHECK_HTTP ${RESPONSIVE_CHECK_HTTP}
ENV GULP_LIVERELOAD_PORT ${GULP_LIVERELOAD_PORT}

USER root

COPY package.json ${NODE_HOME}/

WORKDIR ${NODE_HOME}

RUN apt-get update && \
	apt-get dist-upgrade -y && \
	apt-get install -y \
					firefox \
					graphviz \
					imagemagick \
					php-cli \
					xvfb && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/* && \
	npm -g config set user ${USER_NAME} && \
	npm install -g \
				casperjs \
				gulp \
				marked \
				node-gyp \
				npm-check-updates \
				phplint \
				varstream && \
	npm install -g git+https://github.com/laurentj/slimerjs.git && \
	chown ${USER_NAME}:${USER_NAME} ${NODE_HOME}/package.json && \
	export NODE_TLS_REJECT_UNAUTHORIZED=0 && \
	npm install && \
	chown -R ${USER_NAME}:${USER_NAME} ${NODE_HOME}

COPY entrypoint.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

COPY . ${APP_HOME}

RUN chown -R ${USER_NAME}:${USER_NAME} ${APP_HOME}

WORKDIR ${APP_HOME}

USER ${USER_NAME}

VOLUME [ "${APP_HOME}" ]

EXPOSE ${RESPONSIVE_CHECK_HTTP} ${GULP_LIVERELOAD_PORT}

CMD [ "npm", "start" ]

