<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vital_signs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->decimal('temperature', 5, 2)->nullable()->comment('Celsius');
            $table->unsignedSmallInteger('blood_pressure_systolic')->nullable()->comment('mmHg');
            $table->unsignedSmallInteger('blood_pressure_diastolic')->nullable()->comment('mmHg');
            $table->unsignedSmallInteger('heart_rate')->nullable()->comment('bpm');
            $table->unsignedSmallInteger('respiratory_rate')->nullable()->comment('breaths/min');
            $table->decimal('oxygen_saturation', 5, 2)->nullable()->comment('%');
            $table->decimal('weight', 6, 2)->nullable()->comment('kg');
            $table->decimal('height', 5, 2)->nullable()->comment('cm');
            $table->decimal('bmi', 5, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vital_signs');
    }
};
