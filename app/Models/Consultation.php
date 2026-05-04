<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Consultation extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_PENDING = 'pending';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_ONGOING = 'ongoing';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_NO_SHOW = 'no_show';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SCHEDULED,
        self::STATUS_ONGOING,
        self::STATUS_PAUSED,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
        self::STATUS_NO_SHOW,
    ];

    public const RESCHEDULABLE_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SCHEDULED,
    ];

    public const TERMINAL_STATUSES = [
        self::STATUS_CANCELLED,
        self::STATUS_COMPLETED,
        self::STATUS_NO_SHOW,
    ];

    public const LIVEKIT_ELIGIBLE_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SCHEDULED,
        self::STATUS_ONGOING,
    ];

    public const IDENTITY_VERIFICATION_ELIGIBLE_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SCHEDULED,
        self::STATUS_ONGOING,
        self::STATUS_PAUSED,
    ];

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'type',
        'status',
        'status_before_pause',
        'chief_complaint',
        'scheduled_at',
        'started_at',
        'ended_at',
        'session_token',
        'livekit_room_name',
        'livekit_room_sid',
        'livekit_room_status',
        'livekit_room_created_at',
        'livekit_last_activity_at',
        'livekit_ended_at',
        'livekit_last_error',
        'deepfake_verified',
        'identity_verification_target_user_id',
        'identity_verification_target_role',
        'identity_verification_started_at',
        'identity_verification_expires_at',
        'identity_verification_attempts',
        'identity_verification_resend_available_at',
        'cancellation_reason',
    ];

    protected $hidden = [
        'session_token',
        'livekit_room_sid',
        'livekit_last_error',
    ];

    protected $appends = ['duration_minutes'];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'livekit_room_created_at' => 'datetime',
            'livekit_last_activity_at' => 'datetime',
            'livekit_ended_at' => 'datetime',
            'deepfake_verified' => 'boolean',
            'identity_verification_started_at' => 'datetime',
            'identity_verification_expires_at' => 'datetime',
            'identity_verification_attempts' => 'integer',
            'identity_verification_resend_available_at' => 'datetime',
        ];
    }

    /** Duration in minutes (null if not yet ended) */
    public function getDurationMinutesAttribute(): ?int
    {
        if ($this->started_at && $this->ended_at) {
            return (int) $this->started_at->diffInMinutes($this->ended_at);
        }

        return null;
    }

    // Relationships
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function note(): HasOne
    {
        return $this->hasOne(PatientNote::class);
    }

    public function vitalSigns(): HasOne
    {
        return $this->hasOne(VitalSign::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    public function deepfakeScanLogs(): HasMany
    {
        return $this->hasMany(DeepfakeScanLog::class);
    }

    public function deepfakeEscalations(): HasMany
    {
        return $this->hasMany(DeepfakeEscalation::class);
    }

    public function faceVerificationLogs(): HasMany
    {
        return $this->hasMany(ConsultationFaceVerificationLog::class);
    }

    public function microchecks(): HasMany
    {
        return $this->hasMany(ConsultationMicrocheck::class);
    }

    public function latestMicrocheck(): HasOne
    {
        return $this->hasOne(ConsultationMicrocheck::class)->latestOfMany('scheduled_at');
    }

    public function consents(): HasMany
    {
        return $this->hasMany(ConsultationConsent::class);
    }
}
