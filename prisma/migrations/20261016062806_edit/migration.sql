/*
  Warnings:

  - You are about to drop the column `pdfFileName` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `pdfPath` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `pdfSize` on the `invoices` table. All the data in the column will be lost.
  - Added the required column `pdf` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "pdfFileName",
DROP COLUMN "pdfPath",
DROP COLUMN "pdfSize",
ADD COLUMN     "pdf" TEXT NOT NULL;
