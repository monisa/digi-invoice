<?php

namespace App\Models;

use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class QuoteLineItem extends Model
{
    use HasUuids, SerializesCamelCase;

    public $timestamps = false;

    protected $fillable = [
        'quote_id',
        'product_id',
        'tax_rate_id',
        'description',
        'quantity',
        'unit_price',
        'discount_pct',
        'line_total',
        'position',
    ];

    protected $attributes = [
        'quantity' => 1,
        'discount_pct' => 0,
        'line_total' => 0,
        'position' => 0,
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6',
            'unit_price' => 'decimal:2',
            'discount_pct' => 'decimal:4',
            'line_total' => 'decimal:2',
        ];
    }

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function taxRate()
    {
        return $this->belongsTo(TaxRate::class);
    }
}
