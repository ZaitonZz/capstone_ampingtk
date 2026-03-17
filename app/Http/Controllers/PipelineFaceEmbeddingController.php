<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFaceEmbeddingRequest;
use App\Models\PatientPhoto;
use Illuminate\Http\JsonResponse;

class PipelineFaceEmbeddingController extends Controller
{
    public function store(StoreFaceEmbeddingRequest $request, PatientPhoto $patientPhoto): JsonResponse
    {
        $patientPhoto->update(['face_embedding' => $request->validated('embedding')]);

        return response()->json([
            'photo_id' => $patientPhoto->id,
            'enrolled' => true,
        ]);
    }
}
