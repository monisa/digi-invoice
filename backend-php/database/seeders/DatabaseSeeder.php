<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Idempotent dev seed: one demo tenant + an admin user. Mirrors
 * backend/prisma/seed.ts (`npm run seed`); tax rate + quote template seeding
 * gets added here once those modules are ported (slices 3 and 5).
 *
 * Run with: php artisan db:seed
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $subdomain = 'demo';
        $adminEmail = 'admin@demo.test';
        $adminPassword = 'ChangeMe123!';

        $tenant = Tenant::firstOrCreate(
            ['subdomain' => $subdomain],
            ['company_name' => 'Demo Company', 'plan' => 'PRO', 'currency_default' => 'USD'],
        );

        User::firstOrCreate(
            ['tenant_id' => $tenant->id, 'email' => $adminEmail],
            [
                'name' => 'Demo Admin',
                'password_hash' => Hash::make($adminPassword),
                'role' => 'ADMIN',
                'status' => 'ACTIVE',
            ],
        );

        $this->command?->info("Seeded tenant \"{$tenant->company_name}\" ({$subdomain}).");
        $this->command?->info("Admin login: {$adminEmail} / {$adminPassword}");
    }
}
