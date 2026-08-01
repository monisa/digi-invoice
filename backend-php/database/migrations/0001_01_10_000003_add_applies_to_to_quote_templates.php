<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Templates were Quote-only; they're now usable for Invoice PDFs too.
 * Existing rows default to QUOTE so current behavior is unchanged.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quote_templates', function (Blueprint $table) {
            $table->enum('applies_to', ['QUOTE', 'INVOICE', 'BOTH'])->default('QUOTE')->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('quote_templates', function (Blueprint $table) {
            $table->dropColumn('applies_to');
        });
    }
};
