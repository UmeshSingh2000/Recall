-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "ticket_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "due_date" TIMESTAMP(3),
    "my_context" TEXT NOT NULL DEFAULT '',
    "why_implementing" TEXT NOT NULL DEFAULT '',
    "how_it_works" TEXT NOT NULL DEFAULT '',
    "important_decisions" TEXT NOT NULL DEFAULT '',
    "next_action" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_key_key" ON "tickets"("ticket_key");

-- CreateIndex
CREATE INDEX "tickets_project_id_idx" ON "tickets"("project_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
