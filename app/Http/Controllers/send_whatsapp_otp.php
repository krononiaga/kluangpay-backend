<?php

/**
 * send_whatsapp_otp.php
 * Sends a secure OTP via WhatsApp using Twilio API
 */

// 1. CONFIGURATION - Replace with your actual Twilio credentials
define('TWILIO_ACCOUNT_SID', 'your_account_sid_here');
define('TWILIO_AUTH_TOKEN', 'your_auth_token_here');
define('TWILIO_WHATSAPP_NUMBER', '+14155238886'); // Default Twilio Sandbox number

/**
 * Sends a WhatsApp message via cURL
 */
function sendWhatsAppOTP($recipientNumber, $otpCode)
{
    // Format recipient number (must include country code, e.g., +60123456789)
    $to = 'whatsapp:'.trim($recipientNumber);
    $from = 'whatsapp:'.TWILIO_WHATSAPP_NUMBER;

    // Twilio requires a pre-approved template for sandbox testing.
    // Default Sandbox Template: "Your {{1}} code is {{2}}"
    $messageBody = 'Your verification code is '.$otpCode;

    // Prepare API request payload
    $data = [
        'To' => $to,
        'From' => $from,
        'Body' => $messageBody,
    ];

    $url = 'https://twilio.com'.TWILIO_ACCOUNT_SID.'/Messages.json';

    // Execute secure HTTP POST request
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_USERPWD, TWILIO_ACCOUNT_SID.':'.TWILIO_AUTH_TOKEN);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); // Enforce SSL encryption

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // Evaluate response status
    if ($httpCode === 201) {
        return ['success' => true, 'message' => 'OTP sent successfully.'];
    } else {
        return ['success' => false, 'message' => 'Failed to send OTP.', 'error' => json_decode($response, true)];
    }
}

// ==========================================
// TEST EXECUTION
// ==========================================

// 1. Generate a random 6-digit secure OTP
$generatedOTP = (string) rand(100000, 999999);

// 2. Define target user number (Include country code without spaces or leading zeros)
$userPhoneNumber = '+60123456789';

// 3. Trigger sending
$result = sendWhatsAppOTP($userPhoneNumber, $generatedOTP);

// 4. Output system result
header('Content-Type: application/json');
echo json_encode($result, JSON_PRETTY_PRINT);
