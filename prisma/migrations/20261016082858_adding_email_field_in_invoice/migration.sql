/*
  Warnings:

  - You are about to drop the column `paymentCode` on the `invoices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "invoices_paymentCode_key";

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "paymentCode",
ADD COLUMN     "email" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_email_key" ON "invoices"("email");
