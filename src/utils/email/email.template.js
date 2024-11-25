export const resetPasswordTemplate = (otp, userName) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .email-wrapper {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #333;
            margin: 0;
            padding: 0;
        }
        .content {
            color: #333333;
            line-height: 1.6;
        }
        .otp-code {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 20px 0;
            color: #2c3e50;
        }
        .warning {
            background-color: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #666666;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-wrapper">
            <div class="header">
                <h1>Password Reset OTP</h1>
            </div>
            
            <div class="content">
                <p>Hello${userName ? ' ' + userName : ''},</p>
                <p>You have requested to reset your password. Please use the following OTP code to proceed:</p>
                
                <div class="otp-code">
                    ${otp}
                </div>
                
                <p>This OTP will expire in 15 minutes.</p>
                
                <div class="warning">
                    <strong>Security Notice:</strong>
                    <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                        <li>Never share this OTP with anyone</li>
                        <li>Our team will never ask for your OTP</li>
                        <li>If you didn't request this, please ignore this email</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated message, please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;