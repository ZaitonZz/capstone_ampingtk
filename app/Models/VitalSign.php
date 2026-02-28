<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VitalSign extends Model
{
    use HasFactory;
    protected $fillable = [
        'consultation_id',
        'patient_id',
        'recorded_by',
        'temperature',
        'blood_pressure_systolic',
        'blood_pressure_diastolic',
        'heart_rate',
        'respiratory_rate',
        'oxygen_saturation',
        'weight',
        'height',
        'bmi',
    ];

    protected function casts(): array
    {
        return [
            'temperature'             => 'float',
            'oxygen_saturation'       => 'float',
            'weight'                  => 'float',
            'height'                  => 'float',
            'bmi'                     => 'float',
        ];
    }

    /** Auto-compute BMI if weight & height present */
    public static function boot(): void
    {
        parent::boot();

        static::saving(function (VitalSign $vital) {
            if ($vital->weight && $vital->height && $vital->height > 0) {
                $heightM = $vital->height / 100;
                $vital->bmi = round($vital->weight / ($heightM ** 2), 2);
            }
        });
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
