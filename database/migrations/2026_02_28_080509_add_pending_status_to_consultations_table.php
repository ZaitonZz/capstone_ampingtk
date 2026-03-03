<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->enum('status', ['pending', 'scheduled', 'ongoing', 'completed', 'cancelled', 'no_show'])
                ->default('scheduled')
                ->change();
        });
    }

    public function down(): void
    {
        DB::table('consultations')->where('status', 'pending')->update(['status' => 'scheduled']);

        Schema::table('consultations', function (Blueprint $table) {
            $table->enum('status', ['scheduled', 'ongoing', 'completed', 'cancelled', 'no_show'])
                ->default('scheduled')
                ->change();
        });
    }
};
