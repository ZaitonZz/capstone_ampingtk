<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Support\Carbon;
use Throwable;

trait NormalizesClinicDateTimes
{
    protected function normalizeClinicDateTimes(array $fields): void
    {
        $normalized = [];
        $timezone = config('app.timezone', 'Asia/Manila');

        foreach ($fields as $field) {
            $value = $this->input($field);

            if (! is_string($value) || trim($value) === '') {
                continue;
            }

            try {
                $normalized[$field] = Carbon::parse($value, $timezone)
                    ->setTimezone($timezone)
                    ->format('Y-m-d H:i:s');
            } catch (Throwable) {
                continue;
            }
        }

        if ($normalized !== []) {
            $this->merge($normalized);
        }
    }
}
