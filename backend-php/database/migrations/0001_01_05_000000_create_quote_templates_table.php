<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quote_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->text('header_html')->nullable();
            $table->text('footer_html')->nullable();
            $table->text('terms_html')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
        });

        // quotes.template_id was created as a plain column in slice 4 (this
        // table didn't exist yet); wire up the real FK now that it does.
        Schema::table('quotes', function (Blueprint $table) {
            $table->foreign('template_id')->references('id')->on('quote_templates')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropForeign(['template_id']);
        });
        Schema::dropIfExists('quote_templates');
    }
};
