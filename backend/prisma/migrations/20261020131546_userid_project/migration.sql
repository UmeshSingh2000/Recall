-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");
