<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class AgentTestController extends Controller
{
    /**
     * Store the latest frame result from the LiveKit Python agent.
     */
    public function storeResult(Request $request)
    {
        $data = $request->validate([
            'track_id' => 'required|string',
            'timestamp' => 'required|numeric',
            'width' => 'required|integer',
            'height' => 'required|integer',
            'image' => 'nullable|string',
            'ml_results' => 'required|array',
        ]);

        // Keep the latest result in cache for 60 seconds
        Cache::put('latest_agent_result', $data, 60);

        return response()->json(['status' => 'success']);
    }

    /**
     * Show the agent test verify page.
     */
    public function verifyPage()
    {
        return Inertia::render('test-agent-verify', [
            'result' => Cache::get('latest_agent_result', null),
        ]);
    }
}
