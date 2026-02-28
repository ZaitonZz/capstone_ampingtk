<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpsertDoctorProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->doctorProfile
        );
    }

    public function upsert(UpsertDoctorProfileRequest $request): JsonResponse
    {
        $profile = $request->user()->doctorProfile()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $request->validated()
        );

        $status = $profile->wasRecentlyCreated ? 201 : 200;

        return response()->json($profile, $status);
    }
}
