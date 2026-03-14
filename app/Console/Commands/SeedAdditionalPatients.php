<?php

namespace App\Console\Commands;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Console\Command;

class SeedAdditionalPatients extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'patients:seed {count=100 : Total number of patients to have}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed additional patients to reach the specified total';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $targetCount = (int) $this->argument('count');

        $doctor = User::where('email', 'doctor@example.com')->first();

        if (! $doctor) {
            $this->error('Test doctor account not found. Run db:seed first.');

            return 1;
        }

        $currentCount = Patient::where('registered_by', $doctor->id)->count();
        $needed = $targetCount - $currentCount;

        if ($needed <= 0) {
            $this->info("Already have {$currentCount} patients. No action needed.");

            return 0;
        }

        $this->info("Creating {$needed} additional patients...");

        Patient::factory($needed)->create([
            'registered_by' => $doctor->id,
        ]);

        $this->info("✓ Successfully created {$needed} patients. Total: {$targetCount}");

        return 0;
    }
}
