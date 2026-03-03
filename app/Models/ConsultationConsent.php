<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsultationConsent extends Model
{
    protected $fillable = [
        'consultation_id',
        'user_id',
        'consent_confirmed',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'consent_confirmed' => 'boolean',
            'confirmed_at' => 'datetime',
        ];
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
