<?php

use App\Models\DoctorDutySchedule;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_duty_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('users')->restrictOnDelete();
            $table->date('duty_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('status', DoctorDutySchedule::STATUSES)->default(DoctorDutySchedule::STATUS_ON_DUTY);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['doctor_id', 'duty_date', 'status']);
            $table->index(['duty_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_duty_schedules');
    }
};
