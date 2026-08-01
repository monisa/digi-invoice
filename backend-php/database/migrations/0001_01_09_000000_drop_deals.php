<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropForeign(['deal_id']);
            $table->dropColumn('deal_id');
        });

        Schema::dropIfExists('deals');
    }

    public function down(): void
    {
        Schema::create('deals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->string('name');
            $table->enum('stage', [
                'PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST',
            ])->default('PROSPECTING');
            $table->decimal('amount', 15, 2)->nullable();
            $table->char('currency', 3)->default('USD');
            $table->date('expected_close_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index('account_id');
            $table->index(['tenant_id', 'stage']);
        });

        Schema::table('quotes', function (Blueprint $table) {
            $table->foreignUuid('deal_id')->nullable()->after('contact_id')->constrained('deals')->nullOnDelete();
        });
    }
};
