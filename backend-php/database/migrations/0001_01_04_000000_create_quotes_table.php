<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('quote_number');
            $table->foreignUuid('account_id')->nullable()->constrained('accounts')->restrictOnDelete();
            $table->foreignUuid('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            $table->foreignUuid('deal_id')->nullable()->constrained('deals')->nullOnDelete();
            // FK to quote_templates added once that table exists (slice 5).
            $table->uuid('template_id')->nullable();
            $table->foreignUuid('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', [
                'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED',
            ])->default('DRAFT');
            $table->char('currency', 3)->default('USD');
            $table->decimal('exchange_rate', 18, 6)->default(1);
            // Overall (quote-level) discount applied after line-level discounts.
            $table->enum('overall_discount_type', ['PERCENT', 'AMOUNT'])->default('PERCENT');
            $table->decimal('overall_discount_value', 15, 4)->default(0);
            // Server-computed totals (QuoteCalculator); never trusted from the client.
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->timestamp('valid_until')->nullable();
            // Non-guessable capability token for the public signing link (set on send).
            $table->string('public_token')->nullable()->unique();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'quote_number']);
            $table->index('tenant_id');
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
