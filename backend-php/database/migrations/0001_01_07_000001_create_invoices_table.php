<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('sales_order_id')->nullable()->constrained('sales_orders')->restrictOnDelete();
            $table->string('invoice_number');
            $table->enum('status', ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID'])->default('DRAFT');
            $table->timestamp('due_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'invoice_number']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
