WITH days AS (
    SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
)
SELECT
    s.name AS service_name,
    TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
    CASE
        WHEN COUNT(sd.id) = 0 THEN 0
        ELSE ROUND((COUNT(*) FILTER (WHERE sd.status = true)::decimal / COUNT(sd.id)) * 100, 2)
    END AS uptime,
    CASE
        WHEN COUNT(sd.id) = 0 THEN 'inactive'
        WHEN COUNT(*) FILTER (WHERE sd.status = true) = 0 THEN 'down'
        WHEN COUNT(*) FILTER (WHERE sd.status = true) = COUNT(sd.id) THEN 'operational'
        ELSE 'degraded'
    END AS status
FROM status s
CROSS JOIN days
LEFT JOIN status_details sd
    ON sd.service_id = s.id
   AND sd.timestamp >= days.day
   AND sd.timestamp < (days.day + INTERVAL '1 day')
GROUP BY s.id, s.name, days.day
ORDER BY s.name ASC, days.day ASC;