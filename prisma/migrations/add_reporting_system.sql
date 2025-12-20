-- Create ReportReason enum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'FAKE_REVIEW', 'SCAM', 'OTHER');

-- Create ReportStatus enum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- Create Report table
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "reportedUserId" INTEGER,
    "reportedStoreId" INTEGER,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" INTEGER,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedStoreId_fkey" FOREIGN KEY ("reportedStoreId") REFERENCES "Store"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");
CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");
CREATE INDEX "Report_reportedStoreId_idx" ON "Report"("reportedStoreId");
CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX "Report_reviewedById_idx" ON "Report"("reviewedById");

-- Add constraint: Either reportedUserId or reportedStoreId must be set (but not both required)
-- This is enforced at application level, but we can add a check constraint
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedEntity_check" CHECK (
    ("reportedUserId" IS NOT NULL AND "reportedStoreId" IS NULL) OR 
    ("reportedUserId" IS NULL AND "reportedStoreId" IS NOT NULL)
);
