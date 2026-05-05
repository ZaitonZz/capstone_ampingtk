<?php

namespace App\Services;

use App\Models\DoctorDutySchedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DoctorDutyScheduleService
{
    public const MODE_SINGLE = 'single';

    public const MODE_MULTIPLE_DATES = 'multiple_dates';

    public const MODE_RECURRING_WEEKLY = 'recurring_weekly';

    public const MODES = [
        self::MODE_SINGLE,
        self::MODE_MULTIPLE_DATES,
        self::MODE_RECURRING_WEEKLY,
    ];

    public const WEEKDAYS = [
        'mon' => 1,
        'tue' => 2,
        'wed' => 3,
        'thu' => 4,
        'fri' => 5,
        'sat' => 6,
        'sun' => 7,
    ];

    public function expandEntries(array $payload): array
    {
        $mode = $payload['schedule_mode'] ?? self::MODE_SINGLE;
        $doctorId = (int) $payload['doctor_id'];
        $startTime = $this->normalizeTime((string) $payload['start_time']);
        $endTime = $this->normalizeTime((string) $payload['end_time']);
        $status = (string) $payload['status'];
        $remarks = filled($payload['remarks'] ?? null) ? trim((string) $payload['remarks']) : null;

        $dates = match ($mode) {
            self::MODE_MULTIPLE_DATES => collect($payload['duty_dates'] ?? [])
                ->filter()
                ->map(fn ($date) => Carbon::parse($date)->toDateString())
                ->unique()
                ->sort()
                ->values()
                ->all(),
            self::MODE_RECURRING_WEEKLY => $this->expandRecurringDates(
                (string) ($payload['recurring_start_date'] ?? ''),
                (string) ($payload['recurring_end_date'] ?? ''),
                (array) ($payload['recurring_weekdays'] ?? []),
            ),
            default => filled($payload['duty_date'] ?? null)
                ? [Carbon::parse($payload['duty_date'])->toDateString()]
                : [],
        };

        return collect($dates)
            ->map(fn (string $date) => [
                'doctor_id' => $doctorId,
                'duty_date' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'status' => $status,
                'remarks' => $remarks,
            ])
            ->values()
            ->all();
    }

    public function validateEntries(array $entries, ?int $ignoreId = null): array
    {
        $errors = [];
        $inMemoryIndex = [];

        foreach ($entries as $entry) {
            $indexKey = $this->indexKey($entry['doctor_id'], $entry['duty_date'], $entry['start_time'], $entry['end_time']);

            if (array_key_exists($indexKey, $inMemoryIndex)) {
                $errors[] = sprintf(
                    'Duplicate duty entry detected for %s on %s.',
                    $this->doctorLabel($entry['doctor_id']),
                    $entry['duty_date'],
                );

                continue;
            }

            $inMemoryIndex[$indexKey] = true;

            $conflict = DoctorDutySchedule::query()
                ->where('doctor_id', $entry['doctor_id'])
                ->whereDate('duty_date', $entry['duty_date'])
                ->where(function ($query) use ($entry): void {
                    $query->where('start_time', '<', $entry['end_time'])
                        ->where('end_time', '>', $entry['start_time']);
                })
                ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
                ->first();

            if ($conflict !== null) {
                $errors[] = sprintf(
                    'Doctor already has an overlapping duty schedule on %s between %s and %s.',
                    $entry['duty_date'],
                    $entry['start_time'],
                    $entry['end_time'],
                );
            }
        }

        return array_values(array_unique($errors));
    }

    public function summarizeModes(): array
    {
        return [
            self::MODE_SINGLE => 'Single Date',
            self::MODE_MULTIPLE_DATES => 'Multiple Dates',
            self::MODE_RECURRING_WEEKLY => 'Recurring Weekly',
        ];
    }

    public function weekdays(): array
    {
        return self::WEEKDAYS;
    }

    private function expandRecurringDates(string $startDate, string $endDate, array $weekdays): array
    {
        if (! filled($startDate) || ! filled($endDate) || $weekdays === []) {
            return [];
        }

        $weekdayLookup = collect($weekdays)
            ->filter(fn ($weekday) => array_key_exists((string) $weekday, self::WEEKDAYS))
            ->map(fn ($weekday) => self::WEEKDAYS[(string) $weekday])
            ->unique()
            ->values()
            ->all();

        if ($weekdayLookup === []) {
            return [];
        }

        $period = Carbon::parse($startDate)->startOfDay();
        $ending = Carbon::parse($endDate)->startOfDay();

        $dates = [];

        while ($period->lessThanOrEqualTo($ending)) {
            if (in_array($period->dayOfWeekIso, $weekdayLookup, true)) {
                $dates[] = $period->toDateString();
            }

            $period->addDay();
        }

        return $dates;
    }

    private function normalizeTime(string $time): string
    {
        return Str::length($time) === 5 ? $time.':00' : $time;
    }

    private function indexKey(int $doctorId, string $date, string $startTime, string $endTime): string
    {
        return implode('|', [$doctorId, $date, $startTime, $endTime]);
    }

    private function doctorLabel(int $doctorId): string
    {
        return 'doctor #'.$doctorId;
    }
}
