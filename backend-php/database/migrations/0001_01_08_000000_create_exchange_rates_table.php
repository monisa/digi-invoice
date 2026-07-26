<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->char('base_currency', 3);
            $table->char('target_currency', 3);
            $table->decimal('rate', 18, 6);
            $table->date('effective_date');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['tenant_id', 'base_currency', 'target_currency', 'effective_date'], 'exchange_rates_tenant_currency_date_unique');
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');
    }
};
