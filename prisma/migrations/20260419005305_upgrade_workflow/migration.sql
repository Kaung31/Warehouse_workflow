-- CreateEnum
CREATE TYPE "ErrorCode" AS ENUM ('E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09', 'E10', 'PHYSICAL_CRACK', 'PHYSICAL_BATTERY', 'PHYSICAL_WHEEL', 'PHYSICAL_BRAKE', 'PHYSICAL_DISPLAY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'DISPUTED', 'WARRANTY_APPROVED');

-- CreateEnum
CREATE TYPE "QCResult" AS ENUM ('PASS', 'FAIL', 'NA');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('WARRANTY', 'BGRADE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RepairStatus" ADD VALUE 'AWAITING_CS';
ALTER TYPE "RepairStatus" ADD VALUE 'WAITING_FOR_MECHANIC';
ALTER TYPE "RepairStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "RepairStatus" ADD VALUE 'QUALITY_CONTROL';
ALTER TYPE "RepairStatus" ADD VALUE 'QC_FAILED';
ALTER TYPE "RepairStatus" ADD VALUE 'BGRADE_RECORDED';

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "addressLine1" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RepairOrder" ADD COLUMN     "caseType" "CaseType" NOT NULL DEFAULT 'WARRANTY',
ADD COLUMN     "lastQCSubmissionId" TEXT,
ADD COLUMN     "qcPassed" BOOLEAN,
ADD COLUMN     "repairCompletedAt" TIMESTAMP(3),
ADD COLUMN     "repairDurationMinutes" INTEGER,
ADD COLUMN     "repairStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseComment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCustomerFacing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCChecklistTemplate" (
    "id" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QCChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCChecklistResult" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "result" "QCResult" NOT NULL,
    "notes" TEXT,
    "photoS3Key" TEXT,
    "checkedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QCChecklistResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCSubmission" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "overallResult" "QCResult" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QCSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorCodeReport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "errorCode" "ErrorCode" NOT NULL,
    "faultDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorCodeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairTimeLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "mechanicId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,

    CONSTRAINT "RepairTimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceReference" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseStatusHistory_caseId_idx" ON "CaseStatusHistory"("caseId");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_createdAt_idx" ON "CaseStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "CaseComment_caseId_idx" ON "CaseComment"("caseId");

-- CreateIndex
CREATE INDEX "CaseComment_createdAt_idx" ON "CaseComment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QCChecklistTemplate_stepNumber_key" ON "QCChecklistTemplate"("stepNumber");

-- CreateIndex
CREATE INDEX "QCChecklistResult_caseId_idx" ON "QCChecklistResult"("caseId");

-- CreateIndex
CREATE INDEX "QCChecklistResult_submissionId_idx" ON "QCChecklistResult"("submissionId");

-- CreateIndex
CREATE INDEX "QCSubmission_caseId_idx" ON "QCSubmission"("caseId");

-- CreateIndex
CREATE INDEX "ErrorCodeReport_caseId_idx" ON "ErrorCodeReport"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairTimeLog_caseId_key" ON "RepairTimeLog"("caseId");

-- CreateIndex
CREATE INDEX "RepairTimeLog_mechanicId_idx" ON "RepairTimeLog"("mechanicId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReference_caseId_key" ON "InvoiceReference"("caseId");

-- CreateIndex
CREATE INDEX "InvoiceReference_invoiceNumber_idx" ON "InvoiceReference"("invoiceNumber");

-- CreateIndex
CREATE INDEX "RepairOrder_caseType_idx" ON "RepairOrder"("caseType");

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseComment" ADD CONSTRAINT "CaseComment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseComment" ADD CONSTRAINT "CaseComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCChecklistResult" ADD CONSTRAINT "QCChecklistResult_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCChecklistResult" ADD CONSTRAINT "QCChecklistResult_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QCChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCChecklistResult" ADD CONSTRAINT "QCChecklistResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "QCSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCChecklistResult" ADD CONSTRAINT "QCChecklistResult_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCSubmission" ADD CONSTRAINT "QCSubmission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCSubmission" ADD CONSTRAINT "QCSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCodeReport" ADD CONSTRAINT "ErrorCodeReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairTimeLog" ADD CONSTRAINT "RepairTimeLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairTimeLog" ADD CONSTRAINT "RepairTimeLog_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReference" ADD CONSTRAINT "InvoiceReference_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReference" ADD CONSTRAINT "InvoiceReference_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
