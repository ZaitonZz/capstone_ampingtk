<?php

namespace Database\Seeders;

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ConsultationSeeder extends Seeder
{
    /** Chief complaints keyed by specialty */
    private array $complaints = [
        'Internal Medicine' => [
            'Persistent cough and low-grade fever for 5 days',
            'Fatigue and unexplained weight loss over 2 months',
            'Recurring headaches with nausea',
            'High blood pressure follow-up',
            'Poorly controlled Type 2 Diabetes — HbA1c review',
            'Chest tightness on exertion, shortness of breath',
            'Abdominal pain and bloating after meals',
            'Annual executive check-up',
            'Suspected urinary tract infection',
            'Generalized body malaise and myalgia',
            'Follow-up after hospitalization for pneumonia',
            'Screening for anemia — dizziness and pallor',
        ],
        'Pediatrics' => [
            '3-year-old with fever (38.9 °C) and runny nose for 2 days',
            'Toddler with loose stools and mild dehydration',
            '6-month well-baby check and vaccination',
            'Child rash — suspected chickenpox',
            'Ear pain and difficulty hearing (suspected otitis media)',
            'Recurring tonsillitis in 7-year-old',
            'Asthma flare-up — increased wheeze at night',
            '2-year developmental milestone assessment',
            'School-age child with ADHD symptoms — initial evaluation',
            'Abdominal colic in 4-month-old infant',
            'Annual physical for 10-year-old',
            'Sore throat and white tonsillar exudates',
        ],
        'Dermatology' => [
            'Worsening acne vulgaris — face and back',
            'Chronic eczema flare — both forearms and behind knees',
            'Suspicious pigmented mole on left shoulder — needs biopsy evaluation',
            'Scalp psoriasis with severe flaking',
            'Contact dermatitis — occupational exposure (latex)',
            'Hair thinning and alopecia (androgenetic pattern)',
            'Fungal nail infection — bilateral big toes',
            'Urticaria (hives) — possible drug reaction',
            'Sebaceous cyst on the upper back',
            'Dry, scaly patches on elbows and knees — psoriasis follow-up',
            'Post-inflammatory hyperpigmentation after acne',
            'Wart removal follow-up',
        ],
    ];

    private array $cancellationReasons = [
        'Patient called to cancel — personal emergency.',
        'Patient no longer experiencing symptoms.',
        'Patient requested reschedule; new appointment not yet booked.',
        'Doctor unavailable due to an emergency procedure.',
        'Patient out of town — requested a future date.',
        'Insurance pre-authorization not yet obtained.',
        'Patient admitted to hospital before the appointment.',
        'Patient believes symptoms have resolved on their own.',
    ];

    /** Clinic hours: return a random slot between 8 AM and 4 PM on the given date */
    private function clinicSlot(Carbon $date): Carbon
    {
        $hour = rand(8, 15);
        $minute = rand(0, 1) * 30; // on the hour or half-past

        return $date->copy()->setTime($hour, $minute, 0);
    }

    public function run(): void
    {
        $doctors = User::with('doctorProfile')->where('role', 'doctor')->get();
        $patients = Patient::all();

        if ($doctors->isEmpty() || $patients->isEmpty()) {
            $this->command->warn('Run UserSeeder first — no doctors or patients found.');

            return;
        }

        // Pre-build a list of past weekdays in the last 90 days (for history)
        $pastWeekdays = [];
        for ($daysAgo = 90; $daysAgo >= 2; $daysAgo--) {
            $date = Carbon::today()->subDays($daysAgo);
            if (! $date->isWeekend()) {
                $pastWeekdays[] = $date;
            }
        }

        foreach ($doctors as $doctor) {
            $specialty = $doctor->doctorProfile?->specialty ?? 'Internal Medicine';
            $complaints = $this->complaints[$specialty] ?? $this->complaints['Internal Medicine'];

            // Each doctor sees a rotating pool of patients
            $pool = $patients->shuffle()->take(min(8, $patients->count()));

            // ── 3-month history of completed consultations ────────────────────
            // ~2–3 appointments every working day over 90 days
            foreach ($pastWeekdays as $day) {
                $slotsToday = rand(2, 3);
                $usedHours = [];

                for ($i = 0; $i < $slotsToday; $i++) {
                    // Pick a unique hour slot for this day
                    do {
                        $hour = rand(8, 15);
                    } while (in_array($hour, $usedHours, true));
                    $usedHours[] = $hour;

                    $minute = rand(0, 1) * 30;
                    $scheduledAt = $day->copy()->setTime($hour, $minute, 0);
                    $durationMinutes = rand(15, 45);
                    $startedAt = $scheduledAt->copy()->addMinutes(rand(0, 10));
                    $endedAt = $startedAt->copy()->addMinutes($durationMinutes);

                    // ~15 % are teleconsultation (follow-ups)
                    $isTele = rand(1, 100) <= 15;

                    Consultation::create([
                        'patient_id' => $pool->random()->id,
                        'doctor_id' => $doctor->id,
                        'type' => 'teleconsultation',
                        'status' => 'completed',
                        'chief_complaint' => $complaints[array_rand($complaints)],
                        'scheduled_at' => $scheduledAt,
                        'started_at' => $startedAt,
                        'ended_at' => $endedAt,
                        'session_token' => $isTele ? Str::uuid()->toString() : null,
                        'deepfake_verified' => $isTele ? (bool) rand(0, 1) : null,
                        'cancellation_reason' => null,
                    ]);
                }
            }

            // ── 2 no-shows (recent past) ──────────────────────────────────────
            foreach (range(1, 2) as $i) {
                $daysAgo = rand(3, 21);
                $hour = rand(9, 16);

                Consultation::create([
                    'patient_id' => $pool->random()->id,
                    'doctor_id' => $doctor->id,
                    'type' => 'teleconsultation',
                    'status' => 'no_show',
                    'chief_complaint' => $complaints[array_rand($complaints)],
                    'scheduled_at' => now()->subDays($daysAgo)->setTime($hour, 0),
                    'started_at' => null,
                    'ended_at' => null,
                    'session_token' => null,
                    'deepfake_verified' => null,
                    'cancellation_reason' => null,
                ]);
            }

            // ── 3 cancellations (recent past) ─────────────────────────────────
            foreach (range(1, 3) as $i) {
                $daysAgo = rand(2, 30);
                $hour = rand(8, 16);

                Consultation::create([
                    'patient_id' => $pool->random()->id,
                    'doctor_id' => $doctor->id,
                    'type' => 'teleconsultation',
                    'status' => 'cancelled',
                    'chief_complaint' => $complaints[array_rand($complaints)],
                    'scheduled_at' => now()->subDays($daysAgo)->setTime($hour, 0),
                    'started_at' => null,
                    'ended_at' => null,
                    'session_token' => null,
                    'deepfake_verified' => null,
                    'cancellation_reason' => $this->cancellationReasons[array_rand($this->cancellationReasons)],
                ]);
            }

            // ── 1 currently ongoing ───────────────────────────────────────────
            Consultation::create([
                'patient_id' => $pool->random()->id,
                'doctor_id' => $doctor->id,
                'type' => 'teleconsultation',
                'status' => 'ongoing',
                'chief_complaint' => $complaints[array_rand($complaints)],
                'scheduled_at' => now()->subMinutes(rand(10, 20)),
                'started_at' => now()->subMinutes(rand(5, 15)),
                'ended_at' => null,
                'session_token' => null,
                'deepfake_verified' => null,
                'cancellation_reason' => null,
            ]);

            // ── Upcoming scheduled appointments (next 2 weeks) ────────────────
            $upcomingDays = [1, 2, 3, 5, 7, 8, 10, 12, 14];
            shuffle($upcomingDays);

            foreach (array_slice($upcomingDays, 0, 5) as $daysAhead) {
                $scheduledDate = now()->addDays($daysAhead);

                // Skip to Monday if landing on weekend
                if ($scheduledDate->isWeekend()) {
                    $scheduledDate->next(Carbon::MONDAY);
                }

                $hour = rand(8, 16);
                $isTele = rand(1, 100) <= 20; // 20 % teleconsultation

                Consultation::create([
                    'patient_id' => $pool->random()->id,
                    'doctor_id' => $doctor->id,
                    'type' => 'teleconsultation',
                    'status' => 'scheduled',
                    'chief_complaint' => $complaints[array_rand($complaints)],
                    'scheduled_at' => $scheduledDate->setTime($hour, 0),
                    'started_at' => null,
                    'ended_at' => null,
                    'session_token' => $isTele ? Str::uuid()->toString() : null,
                    'deepfake_verified' => null,
                    'cancellation_reason' => null,
                ]);
            }

            // ── Pending requests (patient-submitted, awaiting approval) ────────
            foreach (range(1, 3) as $i) {
                $daysAhead = rand(3, 14);
                $scheduledDate = now()->addDays($daysAhead);

                if ($scheduledDate->isWeekend()) {
                    $scheduledDate->next(Carbon::MONDAY);
                }

                $hour = rand(9, 16);
                $isTele = rand(1, 100) <= 30;

                Consultation::create([
                    'patient_id' => $pool->random()->id,
                    'doctor_id' => $doctor->id,
                    'type' => 'teleconsultation',
                    'status' => 'pending',
                    'chief_complaint' => $complaints[array_rand($complaints)],
                    'scheduled_at' => $scheduledDate->setTime($hour, 0),
                    'started_at' => null,
                    'ended_at' => null,
                    'session_token' => $isTele ? Str::uuid()->toString() : null,
                    'deepfake_verified' => null,
                    'cancellation_reason' => null,
                ]);
            }
        }
    }
}
