FROM alpine:latest
RUN apk add --no-cache postgresql18-client=18.4-r0 bash=5.3.3-r1
WORKDIR /app
COPY flush.sh /app/flush.sh
RUN chmod +x /app/flush.sh
RUN echo "0 * * * * /bin/sh /app/flush.sh logs 2>&1" >> /etc/crontabs/root
RUN echo "0 0 * * 0 /bin/sh /app/flush.sh traffic 2>&1" >> /etc/crontabs/root
CMD ["crond", "-f", "-l", "2"]
