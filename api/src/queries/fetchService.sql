SELECT
    s.id,
    s.name,
    s.enabled,
    s.url,
    s.port,
    s.notification,
    n.id AS "notificationPolicyId",
    n.name AS "notificationPolicyName",
    n.message AS "notificationPolicyMessage",
    n.webhook AS "notificationPolicyWebhook",
    s.max_consecutive_failures as "maxConsecutiveFailures",
    COALESCE(bars.bars, '[]'::json) AS bars,
    CASE
        WHEN bars.total = 0 THEN 0
        ELSE ROUND((bars.up_count::decimal / bars.total) * 100, 2)
    END AS uptime,
    COALESCE(tags.tags, '[]') AS tags
FROM status s

LEFT JOIN status_notifications n
    ON s.notification = n.id

-- Last 20 bars
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = true) AS up_count,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'status', status,
                'delay', delay,
                'expectedDown', expected_down,
                'upsideDown', upside_down,
                'note', note,
                'timestamp', timestamp
            )
            ORDER BY timestamp DESC
        ) AS bars
    FROM (
        SELECT *
        FROM status_details sd
        WHERE sd.service_id = s.id
        ORDER BY timestamp DESC
        LIMIT 20
    ) last20
) bars ON true

-- Tags from array
LEFT JOIN LATERAL (
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'id', t.id,
            'name', t.name,
            'color', t.color
        )
    ) AS tags
    FROM status_tags t
    WHERE t.id = ANY (s.tags)
) tags ON true

ORDER BY s.name;
