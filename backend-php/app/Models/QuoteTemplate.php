<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class QuoteTemplate extends Model
{
    use BelongsToTenant, HasUuids, SerializesCamelCase, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'applies_to',
        'header_html',
        'footer_html',
        'terms_html',
        'is_default',
    ];

    protected $attributes = [
        'applies_to' => 'QUOTE',
        'is_default' => false,
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    public function quotes()
    {
        return $this->hasMany(Quote::class, 'template_id');
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'template_id');
    }
}
