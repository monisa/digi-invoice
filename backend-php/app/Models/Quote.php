<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Quote extends Model
{
    use BelongsToTenant, HasUuids, SerializesCamelCase, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'quote_number',
        'account_id',
        'contact_id',
        'deal_id',
        'template_id',
        'owner_id',
        'status',
        'currency',
        'exchange_rate',
        'overall_discount_type',
        'overall_discount_value',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'valid_until',
        'public_token',
    ];

    protected $attributes = [
        'status' => 'DRAFT',
        'currency' => 'USD',
        'exchange_rate' => 1,
        'overall_discount_type' => 'PERCENT',
        'overall_discount_value' => 0,
        'subtotal' => 0,
        'discount_total' => 0,
        'tax_total' => 0,
        'grand_total' => 0,
    ];

    protected function casts(): array
    {
        return [
            'exchange_rate' => 'decimal:6',
            'overall_discount_value' => 'decimal:4',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'valid_until' => 'datetime',
        ];
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }

    public function deal()
    {
        return $this->belongsTo(Deal::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class);
    }

    public function lineItems()
    {
        return $this->hasMany(QuoteLineItem::class)->orderBy('position');
    }

    public function activityLog()
    {
        return $this->hasMany(QuoteActivityLog::class)->orderByDesc('created_at');
    }
}
