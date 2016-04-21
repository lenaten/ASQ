FROM asqhub/base-image:devel

MAINTAINER Vincenzo FERME <info@vincenzoferme.it>

# Setup Dependencies
RUN apt-get update -q \
	&& apt-get install -y -q --no-install-recommends git python build-essential unzip \
	&& apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false -o APT::AutoRemove::SuggestsImportant=false \
	# Clean up APT when done.
  && apt-get clean autoclean && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* /var/lib/{apt,dpkg,cache,log}/ /tmp/* /var/tmp/*

# Build performance improvement: http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/
ADD package.json /tmp/package.json
ADD bower.json /tmp/bower.json
ADD config/* /tmp/config/
ADD tasks/* /tmp/tasks/
ADD client/presenterControl/* /tmp/client/presenterControl/
RUN cd /tmp && npm install --unsafe-perm
RUN mkdir -p /opt/app && mkdir -p /opt/app/log && cp -a /tmp/node_modules /opt/app/

# LOAD ASQ
ENV WORKDIR /opt/app
ENV ASQDIR /opt/app
WORKDIR $WORKDIR
# Copy ASQ
COPY . $WORKDIR


# Install ASQ
RUN npm install --unsafe-perm
RUN npm run build
# Uninstall dev dependencies AND Dependencies not needed at runtime
RUN npm prune --production
RUN apt-get remove -y --purge python build-essential
# Clean up when done.
RUN rm -rf /tmp/* /var/tmp/*

# CONFIGURE NGINX, RUNIT
# CONFIGURE NGINX
# Copy custom configuration file from the current directory
RUN cp $WORKDIR/lib/support/nginx/asq.conf /etc/nginx/sites-available/default.conf \
    && ln -s /etc/nginx/sites-available/default.conf /etc/nginx/sites-enabled/default.conf \
    # CONFIGURE RUNIT
    # Nginx
    && mkdir /etc/service/nginx \
    && cp $WORKDIR/lib/support/docker/runit/nginx.sh /etc/service/nginx/run \
    && chmod +x /etc/service/nginx/run \
    # Asq
    && mkdir /etc/service/asq \
    && cp $WORKDIR/lib/support/docker/runit/asq.sh /etc/service/asq/run \
    && chmod +x /etc/service/asq/run

#Configure Image
VOLUME ["/opt/app/plugins"]
VOLUME ["/opt/app/slides"]
#EXPOSE 3000
