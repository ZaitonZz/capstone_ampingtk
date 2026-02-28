<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeepfakeScanLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'consultation_id',
        'result',
        'confidence_score',
        'frame_path',
        'frame_number',
        'model_version',
        'flagged',
        'reviewed_by',
        'reviewed_at',
        'reviewer_notes',
        'scanned_at',
    ];

    protected function casts(): array
    {
        return [
            'confidence_score' => 'float',
            'flagged' => 'boolean',
            'reviewed_at' => 'datetime',
            'scanned_at' => 'datetime',
        ];
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
