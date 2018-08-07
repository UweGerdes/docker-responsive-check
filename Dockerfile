#
# Dockerfile for responsive-check
#
# docker build -t uwegerdes/responsive-check .

FROM uwegerdes/nodejs

MAINTAINER Uwe Gerdes <entwicklung@uwegerdes.de>

ARG RESPONSIVE_CHECK_HTTP='8080'
ARG GULP_LIVERELOAD_PORT='8081'

ENV RESPONSIVE_CHECK_HTTP ${RESPONSIVE_CHECK_HTTP}
ENV GULP_LIVERELOAD_PORT ${GULP_LIVERELOAD_PORT}

USER root

COPY package.json ${NODE_HOME}/

WORKDIR ${NODE_HOME}

RUN apt-get update && \
	apt-get dist-upgrade -y && \
	apt-get install -y \
					software-properties-common \
					xvfb && \
	add-apt-repository -y ppa:mozillateam/ppa && \
	apt-get update && \
	apt-get install -y firefox-esr && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/* && \
	npm install -g \
				casperjs \
				gulp && \
	npm install -g git+https://github.com/laurentj/slimerjs.git#v0.10 && \
	export NODE_TLS_REJECT_UNAUTHORIZED=0 && \
	npm install && \
	chown -R ${USER_NAME}:${USER_NAME} ${NODE_HOME}

ENV SLIMERJSLAUNCHER '/usr/bin/firefox-esr'

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
