-- Clear existing aggregated performance data that has wrong date ranges
DELETE FROM meta_ad_performance WHERE date_start = '2025-06-24' AND date_end = '2025-09-22';

-- Update the performance sync to handle daily data properly
-- The sync will need to be re-run to get proper daily breakdown 