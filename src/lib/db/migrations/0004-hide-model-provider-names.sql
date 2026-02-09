-- Add hideModelProviderNames setting to user_settings
-- Updates existing records to have the new field set to false

UPDATE user_settings 
SET settings = jsonb_set(settings, '{hideModelProviderNames}', 'false')
WHERE settings->'hideModelProviderNames' IS NULL;
