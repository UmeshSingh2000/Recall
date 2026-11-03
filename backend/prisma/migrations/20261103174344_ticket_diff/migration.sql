-- CreateTable
CREATE TABLE "ticket_diffs" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "commit_sha" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_diffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_diffs_object_key_key" ON "ticket_diffs"("object_key");

-- CreateIndex
CREATE INDEX "ticket_diffs_ticket_id_idx" ON "ticket_diffs"("ticket_id");

-- AddForeignKey
ALTER TABLE "ticket_diffs" ADD CONSTRAINT "ticket_diffs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
