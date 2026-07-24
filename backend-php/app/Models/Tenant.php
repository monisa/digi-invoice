<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasUuids;

    protected $fillable = [
        'company_name',
        'subdomain',
        'plan',
        'currency_default',
        'logo_path',
        'status',
    ];

    protected $attributes = [
        'plan' => 'FREE',
        'currency_default' => 'USD',
        'status' => 'ACTIVE',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
