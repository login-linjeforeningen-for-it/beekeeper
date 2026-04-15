WITH period_traffic AS (
    SELECT user_agent, domain, path, method, request_time, status, timestamp
    FROM traffic
    WHERE timestamp BETWEEN NOW() - INTERVAL '7 days' AND NOW()
),
path_stats AS (
    SELECT 
        path, 
        COUNT(*) as count, 
        AVG(request_time) as avg_time, 
        COUNT(*) FILTER (WHERE status >= 400) as error_count
    FROM period_traffic
    GROUP BY 1
),
ua_counts AS (
    SELECT user_agent, COUNT(*) as count
    FROM period_traffic
    GROUP BY 1
),
main_stats AS (
    SELECT 
        COUNT(*) AS total_requests,
        AVG(request_time) AS avg_request_time,
        COALESCE(SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0), 0) AS error_rate
    FROM period_traffic
)
SELECT 
    total_requests,
    avg_request_time,
    error_rate,
    (SELECT jsonb_agg(jsonb_build_object('key', status, 'count', count) ORDER BY count DESC) FROM (
        SELECT status, COUNT(*) AS count FROM period_traffic GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    ) AS t) AS top_status_codes,
    (SELECT jsonb_agg(jsonb_build_object('key', method, 'count', count) ORDER BY count DESC) FROM (
        SELECT method, COUNT(*) AS count FROM period_traffic GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    ) AS t) AS top_methods,
    (SELECT jsonb_agg(jsonb_build_object('key', domain, 'count', count) ORDER BY count DESC) FROM (
        SELECT domain, COUNT(*) AS count FROM period_traffic GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    ) AS t) AS top_domains,
    (SELECT jsonb_agg(jsonb_build_object('key', path, 'count', count) ORDER BY count DESC) FROM (
        SELECT path, count FROM path_stats ORDER BY 2 DESC LIMIT 5
    ) AS t) AS top_paths,
    (SELECT jsonb_agg(jsonb_build_object('key', path, 'avg_time', avg_time) ORDER BY avg_time DESC) FROM (
        SELECT path, avg_time FROM path_stats ORDER BY 2 DESC LIMIT 5
    ) AS t) AS top_slow_paths,
    (SELECT jsonb_agg(jsonb_build_object('key', path, 'count', error_count) ORDER BY error_count DESC) FROM (
        SELECT path, error_count FROM path_stats ORDER BY 2 DESC LIMIT 5
    ) AS t) AS top_error_paths,
    (SELECT jsonb_agg(jsonb_build_object('key', os, 'count', count) ORDER BY count DESC) FROM (
        SELECT 
            CASE
                WHEN user_agent ILIKE '%Windows%' THEN 'Windows'
                WHEN user_agent ILIKE '%Macintosh%' OR user_agent ILIKE '%macOS%' THEN 'MacOS'
                WHEN user_agent ILIKE '%Linux%' THEN 'Linux'
                WHEN user_agent ILIKE '%Android%' THEN 'Android'
                WHEN user_agent ILIKE '%iPhone%' OR user_agent ILIKE '%iPad%' THEN 'iOS'
                WHEN user_agent ILIKE '%Postman%' THEN 'Postman'
                WHEN user_agent ILIKE '%Thunder Client%' THEN 'Thunder Client'
                WHEN user_agent ILIKE '%node%' THEN 'Node.js'
                ELSE 'Other'
            END AS os,
            SUM(count) AS count
        FROM ua_counts
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 5
    ) AS t) AS top_os,
    (SELECT jsonb_agg(jsonb_build_object('key', browser, 'count', count) ORDER BY count DESC) FROM (
        SELECT 
            CASE
                WHEN user_agent ILIKE '%Chrome%' AND user_agent NOT ILIKE '%Edg%' THEN 'Chrome'
                WHEN user_agent ILIKE '%Firefox%' THEN 'Firefox'
                WHEN user_agent ILIKE '%Safari%' AND user_agent NOT ILIKE '%Chrome%' THEN 'Safari'
                WHEN user_agent ILIKE '%Edg%' THEN 'Edge'
                ELSE 'Other'
            END AS browser,
            SUM(count) AS count
        FROM ua_counts
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 5
    ) AS t) AS top_browsers,
    (SELECT jsonb_agg(jsonb_build_object('key', time_bucket::text, 'count', count) ORDER BY time_bucket) FROM (
        SELECT date_trunc('day', timestamp) AS time_bucket, COUNT(*) AS count
        FROM period_traffic
        GROUP BY 1
    ) AS t) AS requests_over_time
FROM main_stats
