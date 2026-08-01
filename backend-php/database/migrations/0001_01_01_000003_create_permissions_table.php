<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Optional granular RBAC layer beyond the fixed roles. Seed per-tenant
        // or globally (tenant_id null => global default for a role).
        Schema::create('permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->enum('role', ['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'VIEWER']);
            $table->string('permission_key');

            $table->unique(['tenant_id', 'role', 'permission_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
