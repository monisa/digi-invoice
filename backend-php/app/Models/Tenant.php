<?php

namespace App\Models;

use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Tenant extends Model
{
    use HasUuids, SerializesCamelCase;

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

    /**
     * Inlined as a data URI rather than a storage URL — the local disk isn't
     * web-reachable (no storage:link on Hostinger shared hosting), and every
     * consumer (Angular header/favicon, PDF header) already just wants image
     * bytes, not a fetchable path.
     */
    public function logoDataUri(): ?string
    {
        if (! $this->logo_path || ! Storage::disk('local')->exists($this->logo_path)) {
            return null;
        }

        $mime = str_ends_with($this->logo_path, '.jpg') || str_ends_with($this->logo_path, '.jpeg')
            ? 'image/jpeg'
            : 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk('local')->get($this->logo_path));
    }
}
