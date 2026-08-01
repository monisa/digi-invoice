<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Invoice status ISSUED -> PENDING (same lifecycle stage, clearer name);
 * VOID is dropped (mapped to DRAFT — the safest fallback, and no VOID
 * invoices are expected to exist yet). No doctrine/dbal is installed, so
 * MySQL/MariaDB's enum is narrowed via raw ALTER TABLE in two steps
 * (widen to add PENDING alongside the old values, remap data, then narrow
 * to the final set) rather than Blueprint::change(). SQLite enforces
 * enum() as a CHECK constraint that can't be altered in place either, so
 * it goes through add-column/copy/drop/rename instead.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('invoices', function (Blueprint $table) {
                $table->string('status_new')->default('DRAFT')->after('status');
            });
            DB::statement("UPDATE invoices SET status_new = CASE status
                WHEN 'ISSUED' THEN 'PENDING'
                WHEN 'VOID' THEN 'DRAFT'
                ELSE status END");
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropColumn('status');
            });
            Schema::table('invoices', function (Blueprint $table) {
                $table->renameColumn('status_new', 'status');
            });

            return;
        }

        DB::statement("ALTER TABLE invoices MODIFY status ENUM('DRAFT','ISSUED','PENDING','PAID','OVERDUE','VOID') NOT NULL DEFAULT 'DRAFT'");
        DB::statement("UPDATE invoices SET status = 'PENDING' WHERE status = 'ISSUED'");
        DB::statement("UPDATE invoices SET status = 'DRAFT' WHERE status = 'VOID'");
        DB::statement("ALTER TABLE invoices MODIFY status ENUM('DRAFT','PENDING','PAID','OVERDUE') NOT NULL DEFAULT 'DRAFT'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('invoices', function (Blueprint $table) {
                $table->string('status_old')->default('DRAFT')->after('status');
            });
            DB::statement("UPDATE invoices SET status_old = CASE status WHEN 'PENDING' THEN 'ISSUED' ELSE status END");
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropColumn('status');
            });
            Schema::table('invoices', function (Blueprint $table) {
                $table->renameColumn('status_old', 'status');
            });

            return;
        }

        DB::statement("ALTER TABLE invoices MODIFY status ENUM('DRAFT','ISSUED','PENDING','PAID','OVERDUE','VOID') NOT NULL DEFAULT 'DRAFT'");
        DB::statement("UPDATE invoices SET status = 'ISSUED' WHERE status = 'PENDING'");
        DB::statement("ALTER TABLE invoices MODIFY status ENUM('DRAFT','ISSUED','PAID','OVERDUE','VOID') NOT NULL DEFAULT 'DRAFT'");
    }
};
