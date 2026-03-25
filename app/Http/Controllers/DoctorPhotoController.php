<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDoctorPhotoRequest;
use Illuminate\Http\JsonResponse;

class DoctorPhotoController extends Controller
{
    public function store(StoreDoctorPhotoRequest $request): JsonResponse
    {
        $doctor = $request->user();

        if (! $doctor->isDoctor()) {
            abort(403, 'Access restricted to doctors.');
        }

        $doctor->doctorPhotos()->update(['is_primary' => false]);

        $path = $request->file('photo')->store(
            "doctors/{$doctor->id}/photos",
            'public'
        );

        $photo = $doctor->doctorPhotos()->create([
            'file_path' => $path,
            'disk' => 'public',
            'is_primary' => true,
            'uploaded_by' => $doctor->id,
        ]);

        return response()->json([
            'id' => $photo->id,
            'file_path' => $photo->file_path,
            'is_primary' => $photo->is_primary,
            'avatar_url' => $doctor->fresh()->avatar,
        ], 201);
    }
}
