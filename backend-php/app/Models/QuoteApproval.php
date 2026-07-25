<?php

namespace App\Models;

use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class QuoteApproval extends Model
{
    use HasUuids, SerializesCamelCase;

    const UPDATED_AT = null;

    protected $fillable = [
        'quote_id',
        'requested_by',
        'approver_id',
        'status',
        'comments',
        'acted_at',
    ];

    protected $attributes = [
        'status' => 'PENDING',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'acted_at' => 'datetime',
        ];
    }

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approver_id');
    }
}
