<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFaceEmbeddingRequest;
use App\Models\DoctorPhoto;
use Illuminate\Http\JsonResponse;

class PipelineDoctorFaceEmbeddingController extends Controller
{
    public function store(StoreFaceEmbeddingRequest $request, DoctorPhoto $doctorPhoto): JsonResponse
    {
        $doctorPhoto->update(['face_embedding' => $request->validated('embedding')]);

        return response()->json([
            'photo_id' => $doctorPhoto->id,
            'enrolled' => true,
        ]);
    }
}
