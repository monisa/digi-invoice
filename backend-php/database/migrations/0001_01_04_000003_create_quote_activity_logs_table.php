<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Append-only audit trail. Never updated or deleted.
        Schema::create('quote_activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('quote_id')->constrained('quotes')->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->json('details_json')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('quote_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_activity_logs');
    }
};
