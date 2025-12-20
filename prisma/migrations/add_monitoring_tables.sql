-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" SERIAL NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "userId" INTEGER,
    "statusCode" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErrorLog_level_idx" ON "ErrorLog"("level");

-- CreateIndex
CREATE INDEX "ErrorLog_endpoint_idx" ON "ErrorLog"("endpoint");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_userId_idx" ON "ErrorLog"("userId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_endpoint_idx" ON "PerformanceMetric"("endpoint");

-- CreateIndex
CREATE INDEX "PerformanceMetric_createdAt_idx" ON "PerformanceMetric"("createdAt");

-- CreateIndex
CREATE INDEX "PerformanceMetric_statusCode_idx" ON "PerformanceMetric"("statusCode");

-- CreateIndex
CREATE INDEX "PerformanceMetric_method_idx" ON "PerformanceMetric"("method");

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;
