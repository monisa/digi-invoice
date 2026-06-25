-- AlterTable: add non-guessable public signing token to quotes
ALTER TABLE `quotes` ADD COLUMN `publicToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `quotes_publicToken_key` ON `quotes`(`publicToken`);
