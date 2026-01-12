# What's Left?

## Core Features

- User Message Editing
- Model Message Regeneration
- Attachment overhaul
  - Context window limit for files (32k)
  - Orphaned attachment cleanup (cron job)

## Bugs

- Auto-scroll can't be overridden
- Models tab doesn't load with no API key set (need better UI)
- Better error handling for invalid API key

- ## Nice to Haves
- Disable auto file creation option in settings
- Keybind listing / more binds
  - New chat bind
  - Edit previous message bind (up arrow in blank chat)
- Delete all threads option
- Account settings (delete, log out of devices)

## Future (Billing)

- Add `storageTier` or `quotaOverrideBytes` column to users table for custom quotas
- Pricing info in thread stats context menu
