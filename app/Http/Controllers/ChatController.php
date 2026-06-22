<?php

namespace App\Http\Controllers;

use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class ChatController extends Controller
{
    public function __invoke(Request $request)
    {
        // 1. Validate incoming user message from your React/Frontend
        $request->validate([
            'message' => 'required|string',
        ]);

        try {
            // 2. Request a generation from Gemini
            $result = Gemini::generativeModel(model: env('GEMINI_MODEL', 'gemini-2.5-flash'))
                ->generateContent($request->input('message'));

            // 3. Send the response text back to your frontend
            return response()->json([
                'reply' => $result->text(),
            ]);

        } catch (Throwable $e) {
            // 4. Log the full internal error details securely to storage/logs/laravel.log
            Log::error('Gemini API communication failed: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            // 5. Return a perfectly generic, safe message to the frontend user
            return response()->json([
                'error' => 'An unexpected error occurred while processing your request. Please try again later.',
            ], 500);
        }
    }
}
