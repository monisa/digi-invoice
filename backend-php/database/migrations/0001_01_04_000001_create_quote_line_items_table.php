<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quote_line_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('quote_id')->constrained('quotes')->cascadeOnDelete();
            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignUuid('tax_rate_id')->nullable()->constrained('tax_rates')->nullOnDelete();
            $table->text('description')->nullable();
            $table->decimal('quantity', 18, 6)->default(1);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('discount_pct', 7, 4)->default(0);
            $table->decimal('line_total', 15, 2)->default(0);
            $table->integer('position')->default(0);

            $table->index('quote_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_line_items');
    }
};
