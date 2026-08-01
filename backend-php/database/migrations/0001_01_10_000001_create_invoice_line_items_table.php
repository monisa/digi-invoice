<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Mirrors quote_line_items exactly — same pricing model, same columns. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_line_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignUuid('tax_rate_id')->nullable()->constrained('tax_rates')->nullOnDelete();
            $table->text('description')->nullable();
            $table->decimal('quantity', 18, 6)->default(1);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('discount_pct', 7, 4)->default(0);
            $table->decimal('line_total', 15, 2)->default(0);
            $table->integer('position')->default(0);

            $table->index('invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_line_items');
    }
};
