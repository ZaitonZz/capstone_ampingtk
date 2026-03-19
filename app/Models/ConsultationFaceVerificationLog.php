<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsultationFaceVerificationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'consultation_id',
        'matched',
        'face_match_score',
        'flagged',
        'checked_at',
    ];

    protected function casts(): array
    {
        return [
            'matched' => 'boolean',
            'flagged' => 'boolean',
            'face_match_score' => 'decimal:4',
            'checked_at' => 'datetime',
        ];
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }
}
