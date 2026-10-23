-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
