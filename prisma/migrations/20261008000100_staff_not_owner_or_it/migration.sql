-- Owner and IT logins are not staff. The previous migration copied everyone who
-- had a (usually empty) pay profile; remove those records when they have no pay
-- rate and no payslips. Anyone actually paid stays, and can be marked as left.
DELETE FROM "Staff" s
USING "User" u
WHERE s."userId" = u."id"
  AND u."role" IN ('OWNER', 'SUPER_ADMIN')
  AND s."payRate" = 0
  AND NOT EXISTS (SELECT 1 FROM "PayrollRecord" r WHERE r."staffId" = s."id");
