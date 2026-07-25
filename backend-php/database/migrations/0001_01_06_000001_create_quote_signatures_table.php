<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quote_signatures', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('quote_id')->constrained('quotes')->cascadeOnDelete();
            $table->string('signer_name');
            $table->string('signer_email')->nullable();
            $table->string('signature_image_path')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('public_token')->unique();
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('quote_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_signatures');
    }
};
