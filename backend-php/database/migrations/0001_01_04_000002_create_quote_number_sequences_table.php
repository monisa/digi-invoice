<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Per-tenant atomic counter backing sequential numbers (quotes,
        // sales orders, ...), e.g. QT-2026-00001. One row per (tenant,
        // prefix, year).
        Schema::create('quote_number_sequences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('prefix')->default('QT');
            $table->integer('year');
            $table->integer('last_value')->default(0);

            $table->unique(['tenant_id', 'prefix', 'year']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_number_sequences');
    }
};
