-- Shared test password for the four staff accounts. Other users are left alone.
UPDATE "User"
SET
  "passwordHash" = '$2b$12$goKsh6yKb.eEoE7KALA.f.pRdFf6NZ07WZET5BMLSV4gMXGpphV/O',
  "passwordResetRequired" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" IN (
  'karim@anis.com',
  'it@anis.com',
  'cashier1@anis.com',
  'cashier2@anis.com'
);
