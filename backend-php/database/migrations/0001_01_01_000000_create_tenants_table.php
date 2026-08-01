<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('company_name');
            $table->string('subdomain')->unique();
            $table->enum('plan', ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'])->default('FREE');
            $table->char('currency_default', 3)->default('USD');
            $table->string('logo_path')->nullable();
            $table->enum('status', ['ACTIVE', 'SUSPENDED', 'CANCELLED'])->default('ACTIVE');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
