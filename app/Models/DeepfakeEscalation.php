<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeepfakeEscalation extends Model
{
    use HasFactory;

    public const TYPE_ADMIN_ALERT = 'admin_alert';

    public const TYPE_DOCTOR_DECISION = 'doctor_decision';

    public const STATUS_OPEN = 'open';

    public const STATUS_RESOLVED = 'resolved';

    protected $fillable = [
        'consultation_id',
        'triggered_by_user_id',
        'triggered_role',
        'type',
        'streak_count',
        'status',
        'decision',
        'resolved_by',
        'resolved_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'streak_count' => 'integer',
            'resolved_at' => 'datetime',
        ];
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by_user_id');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
