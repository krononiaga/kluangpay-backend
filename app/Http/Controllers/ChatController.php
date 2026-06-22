<?php

namespace App\Http\Controllers;

use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __invoke(Request $request)
    {
        // 1. Validate incoming user message from your React/Frontend
        $request->validate([
            'message' => 'required|string',
        ]);

        try {
            // 2. Request a generation from Gemini (Updated to the standard v2.0 generativeModel syntax)
            $result = Gemini::generativeModel(model: env('GEMINI_MODEL', 'gemini-2.5-flash'))
                ->generateContent($request->input('message'));

            // 3. Send the response text back to your frontend
            return response()->json([
                'reply' => $result->text(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to communicate with AI: '.$e->getMessage(),
            ], 500);
        }
    }
}
