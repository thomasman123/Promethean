-- Investigate webhook logs to understand why Slack appointments aren't reaching database
DO $$
BEGIN
    RAISE NOTICE '=== INVESTIGATING WEBHOOK LOGS FOR MISSING APPOINTMENTS ===';
    
    -- Check recent webhook activity
    DECLARE
        webhook_summary RECORD;
    BEGIN
        SELECT 
            COUNT(*) as total_webhooks,
            COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed,
            COUNT(CASE WHEN processing_status = 'error' THEN 1 END) as errors,
            COUNT(CASE WHEN processing_status = 'received' THEN 1 END) as received_only,
            MIN(created_at) as earliest_webhook,
            MAX(created_at) as latest_webhook
        INTO webhook_summary
        FROM webhook_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '2 days';
        
        RAISE NOTICE 'Recent webhook activity (2 days):';
        RAISE NOTICE '  - Total webhooks: %', webhook_summary.total_webhooks;
        RAISE NOTICE '  - Successfully processed: %', webhook_summary.processed;
        RAISE NOTICE '  - Errors: %', webhook_summary.errors;
        RAISE NOTICE '  - Received only: %', webhook_summary.received_only;
        RAISE NOTICE '  - Time range: % to %', 
            webhook_summary.earliest_webhook, webhook_summary.latest_webhook;
    END;
    
    -- Check webhook types and message types
    DECLARE
        webhook_type_rec RECORD;
    BEGIN
        RAISE NOTICE '';
        RAISE NOTICE 'Webhook types in last 2 days:';
        
        FOR webhook_type_rec IN
            SELECT 
                webhook_type,
                (parsed_body->>'messageType') as message_type,
                COUNT(*) as count,
                COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed_count
            FROM webhook_logs
            WHERE created_at >= CURRENT_DATE - INTERVAL '2 days'
            GROUP BY webhook_type, (parsed_body->>'messageType')
            ORDER BY count DESC
        LOOP
            RAISE NOTICE '  - % / %: % total, % processed',
                COALESCE(webhook_type_rec.webhook_type, 'NULL'),
                COALESCE(webhook_type_rec.message_type, 'NULL'),
                webhook_type_rec.count,
                webhook_type_rec.processed_count;
        END LOOP;
    END;
    
    -- Check for appointment-related webhooks specifically
    DECLARE
        appointment_webhook_rec RECORD;
    BEGIN
        RAISE NOTICE '';
        RAISE NOTICE 'Appointment-related webhooks:';
        
        FOR appointment_webhook_rec IN
            SELECT 
                created_at,
                webhook_type,
                (parsed_body->>'messageType') as message_type,
                processing_status,
                (parsed_body->'appointment'->>'id') as appointment_id,
                (parsed_body->>'contactId') as contact_id,
                processing_error
            FROM webhook_logs
            WHERE created_at >= CURRENT_DATE - INTERVAL '2 days'
            AND (
                webhook_type LIKE '%appointment%' OR 
                (parsed_body->>'messageType') LIKE '%appointment%' OR
                parsed_body ? 'appointment'
            )
            ORDER BY created_at DESC
            LIMIT 10
        LOOP
            RAISE NOTICE '% | % | % | % | Contact: % | Error: %',
                appointment_webhook_rec.created_at,
                COALESCE(appointment_webhook_rec.webhook_type, 'NULL'),
                COALESCE(appointment_webhook_rec.message_type, 'NULL'),
                appointment_webhook_rec.processing_status,
                COALESCE(appointment_webhook_rec.contact_id, 'NULL'),
                COALESCE(appointment_webhook_rec.processing_error, 'NONE');
        END LOOP;
        
        IF NOT FOUND THEN
            RAISE NOTICE '❌ NO APPOINTMENT WEBHOOKS FOUND IN LAST 2 DAYS!';
        END IF;
    END;
    
    -- Check for any webhook errors
    DECLARE
        error_webhook_rec RECORD;
        error_count INTEGER := 0;
    BEGIN
        RAISE NOTICE '';
        RAISE NOTICE 'Recent webhook errors:';
        
        FOR error_webhook_rec IN
            SELECT 
                created_at,
                webhook_type,
                (parsed_body->>'messageType') as message_type,
                processing_error,
                response_status
            FROM webhook_logs
            WHERE created_at >= CURRENT_DATE - INTERVAL '2 days'
            AND (processing_status = 'error' OR processing_error IS NOT NULL)
            ORDER BY created_at DESC
            LIMIT 10
        LOOP
            error_count := error_count + 1;
            RAISE NOTICE '% | % | Error: %',
                error_webhook_rec.created_at,
                COALESCE(error_webhook_rec.webhook_type, 'NULL'),
                error_webhook_rec.processing_error;
        END LOOP;
        
        IF error_count = 0 THEN
            RAISE NOTICE '✅ No webhook errors found in last 2 days';
        END IF;
    END;
    
    -- Check if webhook endpoint is receiving any traffic at all
    DECLARE
        total_recent INTEGER;
        last_webhook TIMESTAMP WITH TIME ZONE;
    BEGIN
        SELECT COUNT(*), MAX(created_at) 
        INTO total_recent, last_webhook
        FROM webhook_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 hours';
        
        RAISE NOTICE '';
        RAISE NOTICE 'Recent webhook activity (6 hours):';
        RAISE NOTICE '  - Total webhooks: %', total_recent;
        RAISE NOTICE '  - Last webhook: %', COALESCE(last_webhook::text, 'NONE');
        
        IF total_recent = 0 THEN
            RAISE NOTICE '🚨 NO WEBHOOKS RECEIVED IN LAST 6 HOURS - WEBHOOK ENDPOINT MAY BE DOWN!';
        END IF;
    END;

END $$; 