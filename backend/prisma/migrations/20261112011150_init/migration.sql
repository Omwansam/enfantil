-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "department" TEXT,
    "clinic" TEXT,
    "address" TEXT,
    "county" TEXT,
    "phone" TEXT,
    "code" TEXT,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'clinician',
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "staffNumber" TEXT,
    "email" TEXT,
    "initials" TEXT,
    "tone" TEXT,
    "sees" TEXT[],
    "passwordHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "motherId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "county" TEXT,
    "memberSince" DATE,
    "avatarTone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "tracking" TEXT NOT NULL DEFAULT 'baby',
    "language" TEXT NOT NULL DEFAULT 'en',
    "remindersSms" BOOLEAN NOT NULL DEFAULT true,
    "remindersPush" BOOLEAN NOT NULL DEFAULT true,
    "remindersWeeklyEmail" BOOLEAN NOT NULL DEFAULT false,
    "remindersTiming" TEXT NOT NULL DEFAULT '1 day before',
    "consentSince" DATE,
    "consentRecordedBy" TEXT,
    "consentLastViewed" TIMESTAMP(0),
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mother" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" DATE,
    "phone" TEXT NOT NULL,
    "patientNumber" TEXT,
    "tone" TEXT,
    "bloodGroup" TEXT,
    "hasApp" BOOLEAN NOT NULL DEFAULT false,
    "registeredOn" DATE,
    "nkdaBy" TEXT,
    "nkdaAt" TIMESTAMP(0),
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Mother_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pregnancy" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "lmp" DATE NOT NULL,
    "edd" DATE NOT NULL,
    "gravida" INTEGER,
    "para" INTEGER,
    "status" TEXT NOT NULL,

    CONSTRAINT "Pregnancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AncVisit" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "contact" INTEGER,
    "kind" TEXT NOT NULL DEFAULT 'contact',
    "date" DATE NOT NULL,
    "clinicianId" TEXT,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "fundalHeightCm" DOUBLE PRECISION,
    "fetalHeartRate" INTEGER,
    "hb" DOUBLE PRECISION,
    "urineProtein" TEXT,
    "urineGlucose" TEXT,
    "supplements" TEXT[],
    "tdGiven" TEXT,
    "clinicalNote" TEXT,
    "noteForMother" TEXT,
    "nextVisitOn" DATE,
    "recordedAt" TIMESTAMP(0),
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AncVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "mode" TEXT NOT NULL,
    "gestation" TEXT,
    "outcome" TEXT NOT NULL,
    "babySex" TEXT,
    "babyWeightKg" DOUBLE PRECISION,
    "babyLengthCm" DOUBLE PRECISION,
    "apgar" TEXT,
    "bloodLoss" TEXT,
    "attendedBy" TEXT,
    "childId" TEXT,
    "place" TEXT,
    "notes" TEXT,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostnatalVisit" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "clinicianId" TEXT,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "tempC" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "uterus" TEXT,
    "bleeding" TEXT,
    "perineum" TEXT,
    "breasts" TEXT,
    "epds" INTEGER,
    "hb" DOUBLE PRECISION,
    "mood" TEXT,
    "baby" TEXT,
    "babyWeightKg" DOUBLE PRECISION,
    "babyFeeding" TEXT,
    "babyCord" TEXT,
    "babyJaundice" TEXT,
    "babyTempC" DOUBLE PRECISION,
    "familyPlanning" TEXT,
    "note" TEXT,
    "nextVisitOn" DATE,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PostnatalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TdDose" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "dose" INTEGER NOT NULL,
    "givenOn" DATE,
    "batch" TEXT,
    "givenBy" TEXT,
    "dueOn" DATE,
    "earliestOn" DATE,
    "latestOn" DATE,
    "note" TEXT,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "TdDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PregnancyHistory" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "year" INTEGER,
    "outcome" TEXT,
    "delivery" TEXT,
    "babyWeightKg" DOUBLE PRECISION,
    "gestation" TEXT,
    "childId" TEXT,
    "place" TEXT,
    "by" TEXT,
    "at" TIMESTAMP(0),
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PregnancyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthItem" (
    "id" TEXT NOT NULL,
    "list" TEXT NOT NULL,
    "motherId" TEXT,
    "patientId" TEXT,
    "substance" TEXT,
    "reaction" TEXT,
    "name" TEXT,
    "detail" TEXT,
    "status" TEXT,
    "directions" TEXT,
    "dose" TEXT,
    "code" TEXT,
    "recordedOn" DATE,
    "since" DATE,
    "by" TEXT,
    "at" TIMESTAMP(0),
    "source" TEXT,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "HealthItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "motherId" TEXT,
    "patientId" TEXT,
    "at" TIMESTAMP(0) NOT NULL,
    "by" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL DEFAULT 'tfh',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "patientNumber" TEXT,
    "tone" TEXT,
    "birthWeightKg" DOUBLE PRECISION,
    "birthLengthCm" DOUBLE PRECISION,
    "birthNotificationNo" TEXT,
    "registeredOn" DATE,
    "bornAt" TEXT,
    "mainClinicianId" TEXT,
    "recordStatus" TEXT NOT NULL DEFAULT 'linked',
    "consentVerbal" BOOLEAN,
    "consentRecordedAt" DATE,
    "pastVisits" TEXT[],
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caregiver" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "hasApp" BOOLEAN NOT NULL DEFAULT false,
    "motherId" TEXT,
    "invitedAt" DATE,
    "tone" TEXT,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Caregiver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactAttempt" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "at" TIMESTAMP(0) NOT NULL,
    "replied" BOOLEAN,
    "note" TEXT,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ContactAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dose" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "givenOn" DATE NOT NULL,
    "batch" TEXT,
    "site" TEXT,
    "route" TEXT,
    "givenBy" TEXT,
    "givenById" TEXT,
    "doseNumber" TEXT,
    "facility" TEXT,
    "notes" TEXT,
    "seq" INTEGER,
    "recordedAt" TIMESTAMP(0),
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Dose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionalDose" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "doseNumber" INTEGER,
    "ageLabel" TEXT,
    "dueOn" DATE NOT NULL,
    "givenOn" DATE,
    "batch" TEXT,
    "givenBy" TEXT,
    "facilityLabel" TEXT,
    "addedAt" TIMESTAMP(0),
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "OptionalDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "muacCm" DOUBLE PRECISION,
    "tempC" DOUBLE PRECISION,
    "by" TEXT,
    "facilityId" TEXT,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdOn" DATE NOT NULL,
    "expiresOn" DATE NOT NULL,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "motherId" TEXT,
    "start" TIMESTAMP(0) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 15,
    "reason" TEXT NOT NULL,
    "reasonLong" TEXT,
    "clinicianId" TEXT,
    "room" TEXT,
    "status" TEXT NOT NULL,
    "visitType" TEXT,
    "doseKeys" TEXT[],
    "noteForCaregiver" TEXT,
    "clinicalNote" TEXT,
    "cancelReason" TEXT,
    "history" JSONB,
    "ref" TEXT,
    "location" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(0),
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "motherId" TEXT,
    "accountId" TEXT,
    "forLabel" TEXT,
    "requestedByName" TEXT NOT NULL,
    "requestedByRelationship" TEXT,
    "requestedByPhone" TEXT,
    "requestedByMotherId" TEXT,
    "visitType" TEXT NOT NULL,
    "title" TEXT,
    "preferredStart" TIMESTAMP(0) NOT NULL,
    "clinicianId" TEXT,
    "note" TEXT,
    "requestedAt" TIMESTAMP(0) NOT NULL,
    "status" TEXT NOT NULL,
    "proposalStart" TIMESTAMP(0),
    "proposalClinicianId" TEXT,
    "proposalNote" TEXT,
    "proposalAt" TIMESTAMP(0),
    "proposalBy" TEXT,
    "confirmedStart" TIMESTAMP(0),
    "confirmedClinicianId" TEXT,
    "appointmentId" TEXT,
    "respondedAt" TIMESTAMP(0),
    "declineReason" TEXT,
    "declineNote" TEXT,
    "ref" TEXT,
    "rescheduleOf" TEXT,
    "summary" TEXT,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitNote" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "savedAt" TIMESTAMP(0),
    "signedAt" TIMESTAMP(0),
    "measurements" JSONB,
    "history" TEXT,
    "nutritionStatus" TEXT,
    "plan" TEXT,
    "followUpOn" DATE,
    "diagnosis" TEXT,
    "summary" TEXT,
    "caregiverSummary" TEXT,
    "shareWithCaregiver" BOOLEAN NOT NULL DEFAULT true,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "VisitNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "accountId" TEXT,
    "patientId" TEXT,
    "caregiverId" TEXT,
    "motherId" TEXT,
    "staffId" TEXT,
    "staffName" TEXT,
    "staffRole" TEXT,
    "initials" TEXT,
    "tone" TEXT,
    "unread" INTEGER NOT NULL DEFAULT 0,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "sentAt" TIMESTAMP(0) NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT true,
    "attachmentName" TEXT,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "at" TIMESTAMP(0) NOT NULL,
    "link" TEXT,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "StaffNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StaffNotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyNotification" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "target" JSONB,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "FamilyNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caregiverId" TEXT,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(0) NOT NULL,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageReport" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "registeredUnder2" INTEGER NOT NULL,
    "authorised" INTEGER NOT NULL,
    "fullyImmunized12m" INTEGER NOT NULL,
    "overdueChildren" INTEGER NOT NULL,
    "overdueOver30" INTEGER NOT NULL,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "CoverageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageDose" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "sortKey" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "CoverageDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revision" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_staffNumber_key" ON "Staff"("staffNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_motherId_key" ON "Account"("motherId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_phone_key" ON "Account"("phone");

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_idx" ON "OtpCode"("phone", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Mother_patientNumber_key" ON "Mother"("patientNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Pregnancy_motherId_key" ON "Pregnancy"("motherId");

-- CreateIndex
CREATE INDEX "AncVisit_pregnancyId_idx" ON "AncVisit"("pregnancyId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_pregnancyId_key" ON "Delivery"("pregnancyId");

-- CreateIndex
CREATE INDEX "PostnatalVisit_pregnancyId_idx" ON "PostnatalVisit"("pregnancyId");

-- CreateIndex
CREATE INDEX "TdDose_motherId_idx" ON "TdDose"("motherId");

-- CreateIndex
CREATE INDEX "PregnancyHistory_motherId_idx" ON "PregnancyHistory"("motherId");

-- CreateIndex
CREATE INDEX "HealthItem_motherId_idx" ON "HealthItem"("motherId");

-- CreateIndex
CREATE INDEX "HealthItem_patientId_idx" ON "HealthItem"("patientId");

-- CreateIndex
CREATE INDEX "AuditEntry_motherId_idx" ON "AuditEntry"("motherId");

-- CreateIndex
CREATE INDEX "AuditEntry_patientId_idx" ON "AuditEntry"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientNumber_key" ON "Patient"("patientNumber");

-- CreateIndex
CREATE INDEX "Caregiver_patientId_idx" ON "Caregiver"("patientId");

-- CreateIndex
CREATE INDEX "Caregiver_caregiverId_idx" ON "Caregiver"("caregiverId");

-- CreateIndex
CREATE INDEX "ContactAttempt_patientId_idx" ON "ContactAttempt"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Dose_patientId_key_key" ON "Dose"("patientId", "key");

-- CreateIndex
CREATE INDEX "OptionalDose_patientId_idx" ON "OptionalDose"("patientId");

-- CreateIndex
CREATE INDEX "Measurement_patientId_idx" ON "Measurement"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_start_idx" ON "Appointment"("start");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_motherId_idx" ON "Appointment"("motherId");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Conversation_ownerId_idx" ON "Conversation"("ownerId");

-- CreateIndex
CREATE INDEX "Conversation_accountId_idx" ON "Conversation"("accountId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "StaffNotificationRecipient_staffId_idx" ON "StaffNotificationRecipient"("staffId");

-- CreateIndex
CREATE INDEX "FamilyNotification_accountId_idx" ON "FamilyNotification"("accountId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregnancy" ADD CONSTRAINT "Pregnancy_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AncVisit" ADD CONSTRAINT "AncVisit_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AncVisit" ADD CONSTRAINT "AncVisit_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostnatalVisit" ADD CONSTRAINT "PostnatalVisit_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostnatalVisit" ADD CONSTRAINT "PostnatalVisit_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdDose" ADD CONSTRAINT "TdDose_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PregnancyHistory" ADD CONSTRAINT "PregnancyHistory_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthItem" ADD CONSTRAINT "HealthItem_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthItem" ADD CONSTRAINT "HealthItem_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caregiver" ADD CONSTRAINT "Caregiver_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactAttempt" ADD CONSTRAINT "ContactAttempt_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dose" ADD CONSTRAINT "Dose_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionalDose" ADD CONSTRAINT "OptionalDose_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotificationRecipient" ADD CONSTRAINT "StaffNotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "StaffNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotificationRecipient" ADD CONSTRAINT "StaffNotificationRecipient_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyNotification" ADD CONSTRAINT "FamilyNotification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageDose" ADD CONSTRAINT "CoverageDose_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CoverageReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
