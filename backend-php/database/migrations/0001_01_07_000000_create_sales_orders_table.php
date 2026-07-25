<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('quote_id')->nullable()->constrained('quotes')->restrictOnDelete();
            $table->string('order_number');
            $table->enum('status', ['OPEN', 'FULFILLED', 'CANCELLED'])->default('OPEN');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'order_number']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
