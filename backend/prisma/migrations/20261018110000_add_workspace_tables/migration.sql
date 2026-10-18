-- CreateTable
CREATE TABLE "progress_items" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "progress_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_logs" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'code',
    "description" TEXT NOT NULL,
    "what_remains" TEXT NOT NULL DEFAULT '',
    "next_action" TEXT NOT NULL DEFAULT '',
    "commit_hash" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_files" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_notes" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "paused_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "pause_reason" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "next_action" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "progress_items_ticket_id_idx" ON "progress_items"("ticket_id");

-- CreateIndex
CREATE INDEX "work_logs_ticket_id_created_at_idx" ON "work_logs"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_files_ticket_id_idx" ON "ticket_files"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_notes_ticket_id_idx" ON "ticket_notes"("ticket_id");

-- CreateIndex
CREATE INDEX "work_sessions_ticket_id_started_at_idx" ON "work_sessions"("ticket_id", "started_at");

-- AddForeignKey
ALTER TABLE "progress_items" ADD CONSTRAINT "progress_items_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_files" ADD CONSTRAINT "ticket_files_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
