FROM alpine:latest
RUN apk add --no-cache postgresql-client bash
WORKDIR /app
COPY flush_logs.sh /app/flush_logs.sh
COPY flush_traffic.sh /app/flush_traffic.sh
RUN chmod +x /app/flush_logs.sh
RUN chmod +x /app/flush_traffic.sh
RUN echo "0 * * * * /bin/bash /app/flush_logs.sh 2>&1" >> /etc/crontabs/root
RUN echo "0 0 * * 0 /bin/bash /app/flush_traffic.sh 2>&1" >> /etc/crontabs/root
CMD ["crond", "-f", "-l", "2"]
