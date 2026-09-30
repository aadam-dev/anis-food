-- The till now ships light. Anyone who wants the dark surface can switch it back in Settings.
UPDATE "Setting" SET "value" = 'light', "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = 'pos_theme';
