<?php

use App\Models\DoctorDutyRequest;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_duty_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('users')->restrictOnDelete();
            $table->enum('request_type', DoctorDutyRequest::TYPES);
            $table->date('start_date');
            $table->date('end_date');
            $table->text('remarks')->nullable();
            $table->enum('status', DoctorDutyRequest::STATUSES)->default(DoctorDutyRequest::STATUS_PENDING);
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('reviewer_notes')->nullable();
            $table->timestamps();

            $table->index(['doctor_id', 'status']);
            $table->index(['status', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_duty_requests');
    }
};
