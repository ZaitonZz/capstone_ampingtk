<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AMPING_TK Account Credentials</title>
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
            background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
            color: #ffffff;
            padding: 32px 20px;
            text-align: center;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }

        .content {
            padding: 28px 20px;
            color: #1f2937;
            line-height: 1.6;
        }

        .credentials {
            margin: 20px 0;
            background: #f0fdfa;
            border: 1px solid #99f6e4;
            border-radius: 8px;
            padding: 16px;
        }

        .credentials strong {
            display: inline-block;
            min-width: 180px;
        }

        .temp-password {
            font-family: 'Courier New', monospace;
            font-size: 20px;
            letter-spacing: 1px;
            font-weight: 700;
            color: #0f766e;
        }

        .warning {
            margin-top: 20px;
            background: #fff7ed;
            border: 1px solid #fdba74;
            border-radius: 8px;
            padding: 12px;
            color: #7c2d12;
            font-size: 13px;
        }

        .footer {
            border-top: 1px solid #e5e7eb;
            background: #fafafa;
            color: #6b7280;
            font-size: 12px;
            text-align: center;
            padding: 16px;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>AMPING_TK</h1>
        <p>Your account has been created by an administrator.</p>
    </div>

    <div class="content">
        <p>Hello {{ $recipientName }},</p>

        <p>An administrator created an AMPING_TK account for you.</p>

        <div class="credentials">
            <div><strong>Assigned role:</strong> {{ $role }}</div>
            <div><strong>Temporary password:</strong> <span class="temp-password">{{ $temporaryPassword }}</span></div>
        </div>

        <p>Use your registered email address and this temporary password to sign in.</p>

        <div class="warning">
            You will be required to change your password immediately after your first login.
            Do not share this temporary password with anyone.
        </div>
    </div>

    <div class="footer">
        This is an automated message from AMPING_TK. Please do not reply.
    </div>
</div>
</body>
</html>
