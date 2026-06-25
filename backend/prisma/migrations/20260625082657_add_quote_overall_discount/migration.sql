-- AlterTable
ALTER TABLE `quotes` ADD COLUMN `overallDiscountType` ENUM('PERCENT', 'AMOUNT') NOT NULL DEFAULT 'PERCENT',
    ADD COLUMN `overallDiscountValue` DECIMAL(15, 4) NOT NULL DEFAULT 0;
