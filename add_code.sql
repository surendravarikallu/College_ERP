ALTER TABLE "Department" ADD COLUMN "code" TEXT NOT NULL DEFAULT 'CSE';
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
