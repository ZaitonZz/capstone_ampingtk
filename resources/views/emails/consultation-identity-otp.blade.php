<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Consultation Identity Verification</title>
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
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            color: #ffffff;
            padding: 32px 20px;
            text-align: center;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }

        .header p {
            margin: 8px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
        }

        .content {
            padding: 32px 20px;
            color: #1f2937;
            line-height: 1.6;
        }

        .otp-box {
            margin: 24px 0;
            border: 2px solid #0f766e;
            border-radius: 8px;
            background: #f0fdfa;
            padding: 20px;
            text-align: center;
        }

        .otp-label {
            margin: 0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #334155;
        }

        .otp-code {
            margin: 8px 0;
            font-size: 40px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #0f766e;
            font-family: 'Courier New', monospace;
        }

        .notice {
            margin-top: 12px;
            font-size: 12px;
            color: #7f1d1d;
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 10px;
        }

        .footer {
            border-top: 1px solid #e5e7eb;
            background: #fafafa;
            color: #6b7280;
            font-size: 12px;
            text-align: center;
            padding: 16px;
        }

        @media (max-width: 600px) {
            .otp-code {
                font-size: 32px;
                letter-spacing: 6px;
            }
        }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>AMPING_TK</h1>
        <p>Consultation paused for identity verification</p>
    </div>

    <div class="content">
        <p>Hello {{ $recipientName }},</p>

        <p>
            Your consultation #{{ $consultationId }} was paused because the {{ $targetRole }} stream triggered
            repeated deepfake flags. Enter this one-time verification code to resume participation.
        </p>

        <div class="otp-box">
            <p class="otp-label">Verification Code</p>
            <p class="otp-code">{{ $otp }}</p>
            <div class="notice">
                Please check your email. This code expires in {{ $expiryMinutes }} minute(s). Do not share it with anyone.
            </div>
        </div>

        <p>
            If this verification is not completed in time or too many incorrect codes are submitted,
            the consultation will be cancelled automatically.
        </p>
    </div>

    <div class="footer">
        <p>
            This is an automated security message from AMPING_TK.<br>
            Please do not reply to this email.
        </p>
    </div>
</div>
</body>
</html>
