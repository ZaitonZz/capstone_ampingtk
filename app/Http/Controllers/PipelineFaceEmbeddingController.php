<?php

namespace App\Http\Controllers;

class PipelineFaceEmbeddingController extends Controller
{
    public function store(\App\Http\Requests\StoreFaceEmbeddingRequest $request, \App\Models\PatientPhoto $patientPhoto): \Illuminate\Http\JsonResponse
    {
        $patientPhoto->update(['face_embedding' => $request->validated('embedding')]);

        return response()->json([
            'photo_id' => $patientPhoto->id,
            'enrolled' => true,
        ]);
    }
}
