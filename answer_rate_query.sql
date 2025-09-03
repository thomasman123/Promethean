-- Answer Rate and Conversation Rate Analysis
-- This query calculates the percentage of answered calls and meaningful conversations
-- out of total dials, with optional account filtering

WITH dial_stats AS (
  SELECT 
    COUNT(*) as total_dials,
    COUNT(*) FILTER (WHERE answered = true) as answered_calls,
    COUNT(*) FILTER (WHERE meaningful_conversation = true) as meaningful_conversations
  FROM dials
  WHERE 1=1
    -- Add account filter if needed
    -- AND account_id = 'your-account-id-here'
    
    -- Add date range filter if needed
    -- AND date_called >= '2024-01-01'
    -- AND date_called < '2024-02-01'
)
SELECT 
  'Answer Rate' as metric_type,
  answered_calls as count,
  total_dials,
  CASE 
    WHEN total_dials = 0 THEN 0.00
    ELSE ROUND((answered_calls::DECIMAL / total_dials::DECIMAL) * 100, 2)
  END as percentage
FROM dial_stats

UNION ALL

SELECT 
  'Conversation Rate' as metric_type,
  meaningful_conversations as count,
  total_dials,
  CASE 
    WHEN total_dials = 0 THEN 0.00
    ELSE ROUND((meaningful_conversations::DECIMAL / total_dials::DECIMAL) * 100, 2)
  END as percentage
FROM dial_stats

ORDER BY metric_type; 