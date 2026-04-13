SELECT
    s.name AS service_name,
    CASE
        WHEN COUNT(sd.id) = 0 THEN 0
        ELSE ROUND((COUNT(*) FILTER (WHERE sd.status = true)::decimal / COUNT(sd.id)) * 100, 2)
    END AS uptime_last_month
FROM status s
LEFT JOIN status_details sd
    ON sd.service_id = s.id
   AND sd.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY s.id, s.name
ORDER BY s.name ASC;