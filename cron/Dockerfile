FROM alpine:latest
RUN apk add --no-cache postgresql18-client bash
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY flush.sh /app/flush.sh
RUN chmod +x /app/flush.sh \
    && chown app:app /app/flush.sh \
    && mkdir -p /var/spool/cron/crontabs \
    && printf '0 * * * *\t/bin/sh /app/flush.sh logs 2>&1\n0 0 * * 0\t/bin/sh /app/flush.sh traffic 2>&1\n' \
       > /var/spool/cron/crontabs/app \
    && chmod 600 /var/spool/cron/crontabs/app \
    && chown -R app:app /var/spool/cron/crontabs

USER app
CMD ["crond", "-f", "-l", "2"]
