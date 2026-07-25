<?php

namespace App\Models;

use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class QuoteSignature extends Model
{
    use HasUuids, SerializesCamelCase;

    const UPDATED_AT = null;

    protected $fillable = [
        'quote_id',
        'signer_name',
        'signer_email',
        'signature_image_path',
        'ip_address',
        'public_token',
        'signed_at',
    ];

    protected function casts(): array
    {
        return [
            'signed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }
}
