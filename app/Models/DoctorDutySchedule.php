<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class DoctorDutySchedule extends Model
{
    use HasFactory;

    public const STATUS_ON_DUTY = 'on_duty';

    public const STATUS_OFF_DUTY = 'off_duty';

    public const STATUS_ABSENT = 'absent';

    public const STATUS_ON_LEAVE = 'on_leave';

    public const STATUSES = [
        self::STATUS_ON_DUTY,
        self::STATUS_OFF_DUTY,
        self::STATUS_ABSENT,
        self::STATUS_ON_LEAVE,
    ];

    protected $fillable = [
        'doctor_id',
        'duty_date',
        'start_time',
        'end_time',
        'status',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'duty_date' => 'date',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function scopeAvailableAt(Builder $query, Carbon $scheduledAt): Builder
    {
        return $query
            ->whereDate('duty_date', $scheduledAt->toDateString())
            ->where('status', self::STATUS_ON_DUTY)
            ->where('start_time', '<=', $scheduledAt->format('H:i:s'))
            ->where('end_time', '>=', $scheduledAt->format('H:i:s'));
    }
}
