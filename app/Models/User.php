<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'must_change_password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = ['avatar'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'must_change_password' => 'boolean',
        ];
    }

    // Role helpers
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isDoctor(): bool
    {
        return $this->role === 'doctor';
    }

    public function isPatient(): bool
    {
        return $this->role === 'patient';
    }

    public function isMedicalStaff(): bool
    {
        return $this->role === 'medicalstaff';
    }

    public function isClinicalStaff(): bool
    {
        return $this->isDoctor() || $this->isAdmin() || $this->isMedicalStaff();
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isInactive(): bool
    {
        return $this->status === 'inactive';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function requiresPasswordChange(): bool
    {
        return (bool) $this->must_change_password;
    }

    public function getAvatarAttribute(): ?string
    {
        if ($this->isDoctor()) {
            $photo = $this->primaryDoctorPhoto()->first();

            if ($photo?->file_path && $photo->disk === 'public') {
                return "/storage/{$photo->file_path}";
            }
        }

        return null;
    }

    // Relationships
    public function doctorProfile(): HasOne
    {
        return $this->hasOne(DoctorProfile::class);
    }

    public function patientProfile(): HasOne
    {
        return $this->hasOne(Patient::class);
    }

    /** Consultations where this user is the attending doctor */
    public function consultations(): HasMany
    {
        return $this->hasMany(Consultation::class, 'doctor_id');
    }

    /** Prescriptions written by this doctor */
    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class, 'doctor_id');
    }

    /** Deepfake scan logs reviewed by this user */
    public function reviewedScans(): HasMany
    {
        return $this->hasMany(DeepfakeScanLog::class, 'reviewed_by');
    }

    /** Consultation consents confirmed by this user */
    public function consultationConsents(): HasMany
    {
        return $this->hasMany(ConsultationConsent::class);
    }

    /** Activity logs performed by this user */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    /** Doctor photos for ArcFace enrollment */
    public function doctorPhotos(): HasMany
    {
        return $this->hasMany(DoctorPhoto::class);
    }

    /** Primary doctor photo for verification */
    public function primaryDoctorPhoto(): HasOne
    {
        return $this->hasOne(DoctorPhoto::class)->where('is_primary', true)->latestOfMany();
    }
}
