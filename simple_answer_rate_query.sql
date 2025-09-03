-- Simple Answer Rate and Conversation Rate Query
-- Returns percentages of answered calls and meaningful conversations

SELECT 
  ROUND(
    (COUNT(*) FILTER (WHERE answered = true)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
    2
  ) as answer_rate_percentage,
  
  ROUND(
    (COUNT(*) FILTER (WHERE meaningful_conversation = true)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
    2
  ) as conversation_rate_percentage,
  
  COUNT(*) as total_dials,
  COUNT(*) FILTER (WHERE answered = true) as total_answered,
  COUNT(*) FILTER (WHERE meaningful_conversation = true) as total_conversations

FROM dials
WHERE 1=1
  -- Add filters as needed:
  -- AND account_id = 'your-account-id-here'
  -- AND date_called >= '2024-01-01'
  -- AND date_called < '2024-02-01'; 