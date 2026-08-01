<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Invoices previously had no amount of their own — totals were always
 * derived from salesOrder.quote.grand_total, since the only way to create
 * one was converting a Sales Order. Invoices can now also be created
 * directly (see invoice_line_items migration alongside this one), so they
 * need the same header/totals shape Quotes already have.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignUuid('account_id')->nullable()->after('sales_order_id')
                ->constrained('accounts')->restrictOnDelete();
            $table->foreignUuid('contact_id')->nullable()->after('account_id')
                ->constrained('contacts')->nullOnDelete();
            $table->foreignUuid('owner_id')->nullable()->after('contact_id')
                ->constrained('users')->nullOnDelete();
            $table->foreignUuid('template_id')->nullable()->after('owner_id')
                ->constrained('quote_templates')->nullOnDelete();
            $table->char('currency', 3)->default('USD')->after('template_id');
            $table->decimal('exchange_rate', 18, 6)->default(1)->after('currency');
            $table->enum('overall_discount_type', ['PERCENT', 'AMOUNT'])->default('PERCENT')->after('exchange_rate');
            $table->decimal('overall_discount_value', 15, 4)->default(0)->after('overall_discount_type');
            $table->decimal('subtotal', 15, 2)->default(0)->after('overall_discount_value');
            $table->decimal('discount_total', 15, 2)->default(0)->after('subtotal');
            $table->decimal('tax_total', 15, 2)->default(0)->after('discount_total');
            $table->decimal('grand_total', 15, 2)->default(0)->after('tax_total');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropForeign(['contact_id']);
            $table->dropForeign(['owner_id']);
            $table->dropForeign(['template_id']);
            $table->dropColumn([
                'account_id', 'contact_id', 'owner_id', 'template_id',
                'currency', 'exchange_rate', 'overall_discount_type', 'overall_discount_value',
                'subtotal', 'discount_total', 'tax_total', 'grand_total',
            ]);
        });
    }
};
