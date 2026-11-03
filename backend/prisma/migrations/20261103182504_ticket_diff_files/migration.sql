-- CreateTable
CREATE TABLE "ticket_diff_files" (
    "id" SERIAL NOT NULL,
    "ticket_diff_id" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_diff_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_diff_files_object_key_key" ON "ticket_diff_files"("object_key");

-- CreateIndex
CREATE INDEX "ticket_diff_files_ticket_diff_id_idx" ON "ticket_diff_files"("ticket_diff_id");

-- AddForeignKey
ALTER TABLE "ticket_diff_files" ADD CONSTRAINT "ticket_diff_files_ticket_diff_id_fkey" FOREIGN KEY ("ticket_diff_id") REFERENCES "ticket_diffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
