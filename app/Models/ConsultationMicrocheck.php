<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsultationMicrocheck extends Model
{
    use HasFactory;

    protected $fillable = [
        'consultation_id',
        'cycle_key',
        'target_role',
        'status',
        'scheduled_at',
        'claimed_at',
        'completed_at',
        'expires_at',
        'latency_ms',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'claimed_at' => 'datetime',
            'completed_at' => 'datetime',
            'expires_at' => 'datetime',
            'latency_ms' => 'integer',
        ];
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }
}
