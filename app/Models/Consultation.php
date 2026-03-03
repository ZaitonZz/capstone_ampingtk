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

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'type',
        'status',
        'chief_complaint',
        'scheduled_at',
        'started_at',
        'ended_at',
        'session_token',
        'deepfake_verified',
        'cancellation_reason',
    ];

    protected $appends = ['duration_minutes'];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'deepfake_verified' => 'boolean',
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

    public function consents(): HasMany
    {
        return $this->hasMany(ConsultationConsent::class);
    }
}
