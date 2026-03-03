<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'registered_by',
        'first_name',
        'last_name',
        'middle_name',
        'date_of_birth',
        'gender',
        'civil_status',
        'contact_number',
        'email',
        'address',
        'blood_type',
        'emergency_contact_name',
        'emergency_contact_number',
        'known_allergies',
    ];

    protected $appends = ['age', 'full_name'];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    /** Full name accessor */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->middle_name} {$this->last_name}");
    }

    /** Age in years */
    public function getAgeAttribute(): ?int
    {
        return $this->date_of_birth?->age;
    }

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(PatientPhoto::class);
    }

    public function primaryPhoto(): HasOne
    {
        return $this->hasOne(PatientPhoto::class)->where('is_primary', true)->latestOfMany();
    }

    public function consultations(): HasMany
    {
        return $this->hasMany(Consultation::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(PatientNote::class);
    }

    public function vitalSigns(): HasMany
    {
        return $this->hasMany(VitalSign::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }
}
