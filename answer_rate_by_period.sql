-- Answer Rate and Conversation Rate by Time Period
-- Shows trends over time (daily, weekly, or monthly)

SELECT 
  DATE_TRUNC('day', date_called) as period,  -- Change to 'week' or 'month' as needed
  
  COUNT(*) as total_dials,
  COUNT(*) FILTER (WHERE answered = true) as answered_calls,
  COUNT(*) FILTER (WHERE meaningful_conversation = true) as meaningful_conversations,
  
  ROUND(
    (COUNT(*) FILTER (WHERE answered = true)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
    2
  ) as answer_rate_percentage,
  
  ROUND(
    (COUNT(*) FILTER (WHERE meaningful_conversation = true)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
    2
  ) as conversation_rate_percentage

FROM dials
WHERE 1=1
  -- Add filters as needed:
  -- AND account_id = 'your-account-id-here'
  -- AND date_called >= '2024-01-01'
  -- AND date_called < '2024-02-01'
  
GROUP BY DATE_TRUNC('day', date_called)  -- Match the period in SELECT
ORDER BY period DESC; 