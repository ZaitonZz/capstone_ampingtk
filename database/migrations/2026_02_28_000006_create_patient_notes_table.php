<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->restrictOnDelete();
            $table->foreignId('doctor_id')->constrained('users')->restrictOnDelete();
            // SOAP
            $table->text('subjective')->nullable();   // Patient's reported symptoms / history
            $table->text('objective')->nullable();    // Clinician's observations / exam findings
            $table->text('assessment')->nullable();   // Diagnosis or differential diagnoses
            $table->text('plan')->nullable();         // Treatment, follow-up, referrals
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_notes');
    }
};
