<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use BelongsToTenant, HasUuids, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'password_hash',
        'role',
        'status',
        'last_login_at',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected function casts(): array
    {
        return [
            'last_login_at' => 'datetime',
        ];
    }

    /** Authenticatable expects this; our column is password_hash, not password. */
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function refreshTokens()
    {
        return $this->hasMany(RefreshToken::class);
    }
}
