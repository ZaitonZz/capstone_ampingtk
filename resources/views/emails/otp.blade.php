<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AMPING_TK Login Verification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 8px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 20px;
        }
        .greeting {
            font-size: 16px;
            color: #1f2937;
            margin-bottom: 24px;
            line-height: 1.5;
        }
        .otp-section {
            background-color: #f0fdf4;
            border: 2px solid #059669;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-label {
            font-size: 14px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            font-weight: 500;
        }
        .otp-code {
            font-size: 48px;
            font-weight: 700;
            color: #059669;
            letter-spacing: 12px;
            font-family: 'Courier New', monospace;
            margin: 0;
            word-spacing: 20px;
        }
        .expiry-notice {
            font-size: 12px;
            color: #7f1d1d;
            background-color: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 4px;
            padding: 12px;
            margin-top: 20px;
            line-height: 1.5;
        }
        .info-section {
            background-color: #f3f4f6;
            border-left: 4px solid #059669;
            padding: 16px;
            border-radius: 4px;
            margin: 24px 0;
            font-size: 14px;
            color: #374151;
            line-height: 1.6;
        }
        .info-section strong {
            color: #1f2937;
            display: block;
            margin-bottom: 8px;
        }
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 4px;
            padding: 12px;
            margin: 24px 0;
            font-size: 12px;
            color: #7c2d12;
            line-height: 1.5;
        }
        .security-note strong {
            display: block;
            margin-bottom: 6px;
        }
        .footer {
            border-top: 1px solid #e5e7eb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            background-color: #fafafa;
        }
        .footer p {
            margin: 0;
            line-height: 1.6;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
            }
            .header {
                padding: 30px 15px;
            }
            .header h1 {
                font-size: 24px;
            }
            .content {
                padding: 30px 15px;
            }
            .otp-code {
                font-size: 36px;
                letter-spacing: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>AMPING_TK</h1>
            <p>Secure Telemedicine Platform</p>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Greeting -->
            <div class="greeting">
                Hello,<br>
                Your login to AMPING_TK has been initiated. Please use the verification code below to complete your login.
            </div>

            <!-- OTP Section -->
            <div class="otp-section">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">{{ $otp }}</div>
                <div class="expiry-notice">
                    ⏱️ This code expires in {{ $expiryMinutes }} minutes. Do not share this code with anyone.
                </div>
            </div>

            <!-- Info Section -->
            <div class="info-section">
                <strong>What to do:</strong>
                Please check your email. Enter this 6-digit verification code in the login screen to gain access to your account.
            </div>

            <!-- Security Note -->
            <div class="security-note">
                <strong>🔒 Security Notice:</strong>
                If you did not attempt to log in to your AMPING_TK account, please ignore this email. Your account will remain secure. Never share your verification code with anyone, including AMPING_TK support staff.
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>
                © {{ date('Y') }} AMPING_TK. All rights reserved.<br>
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
