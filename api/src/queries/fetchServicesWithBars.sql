SELECT
    s.*,
    COALESCE(sd.bars, '[]'::json) AS bars
FROM status s
LEFT JOIN LATERAL (
    SELECT
        json_agg(
            json_build_object(
                'id', d.id,
                'status', d.status,
                'expected_down', d.expected_down,
                'upside_down', d.upside_down,
                'delay', d.delay,
                'note', d.note,
                'timestamp', d.timestamp
            )
            ORDER BY d.timestamp DESC
        ) AS bars
    FROM (
        SELECT *
        FROM status_details d
        WHERE d.service_id = s.id
          AND d.timestamp >= NOW() - INTERVAL '90 seconds'
        ORDER BY d.timestamp DESC
    ) d
) sd ON TRUE
WHERE s.enabled = TRUE
  AND ($1::int IS NULL OR s.id = $1);
