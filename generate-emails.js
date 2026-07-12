const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'email-templates');

if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir);
}

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0F172A; font-family: 'Inter', Helvetica, Arial, sans-serif; }
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
        
        .btn-primary {
            background-color: #4F46E5;
            border-radius: 8px;
            color: #ffffff;
            display: inline-block;
            font-size: 16px;
            font-weight: 600;
            padding: 14px 28px;
            text-decoration: none;
        }

        .btn-secondary {
            background-color: #F3F4F6;
            border-radius: 8px;
            color: #374151;
            display: inline-block;
            font-size: 16px;
            font-weight: 600;
            padding: 14px 28px;
            text-decoration: none;
        }

        .btn-danger {
            background-color: #EF4444;
            border-radius: 8px;
            color: #ffffff;
            display: inline-block;
            font-size: 16px;
            font-weight: 600;
            padding: 14px 28px;
            text-decoration: none;
        }
        
        @media screen and (max-width: 600px) {
            .wrapper { width: 100% !important; max-width: 100% !important; }
            .card { border-radius: 0 !important; }
            .responsive-table { width: 100% !important; }
        }

        /* Unique Responsive Animations */
        @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
            100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }

        @keyframes slideInRight {
            0% { opacity: 0; transform: translateX(30px); }
            100% { opacity: 1; transform: translateX(0); }
        }

        .animate-fade-in-up {
            animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-slide-in-right {
            animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
            opacity: 0; /* starts hidden before animation */
        }

        .btn-primary:hover {
            animation: pulseGlow 1.5s infinite;
        }
    </style>
</head>
<body style="background-color: #0F172A; margin: 0 !important; padding: 0 !important; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 10px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="wrapper">
                    <!-- HEADER -->
                    <tr>
                        <td align="left" style="padding-bottom: 20px;">
                            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; transition: all 0.3s ease;">
                                <span style="color: #6366F1;">N</span> NovaFlow
                            </h2>
                        </td>
                    </tr>
                    
                    <!-- MAIN CARD -->
                    <tr>
                        <td bgcolor="#ffffff" align="left" style="padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);" class="card animate-fade-in-up">
                            ${content}
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td align="center" style="padding: 30px 0;" class="animate-slide-in-right">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="responsive-table">
                                <tr>
                                    <td align="center" style="color: #94A3B8; font-size: 12px; padding-bottom: 15px;">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding: 0 10px;">🔒 Secure<br><span style="font-size:10px;">Your data is safe</span></td>
                                                <td align="center" style="padding: 0 10px;">⚡ Lightning Fast<br><span style="font-size:10px;">Built for speed</span></td>
                                                <td align="center" style="padding: 0 10px;">🎧 24/7 Support<br><span style="font-size:10px;">We're here to help</span></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="color: #64748B; font-size: 14px;">
                                        Need Help? <a href="mailto:support@novaflow.com" style="color: #6366F1; text-decoration: none;">support@novaflow.com</a><br>
                                        <a href="https://novaflow.com" style="color: #6366F1; text-decoration: none;">www.novaflow.com</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="color: #475569; font-size: 12px; padding-top: 20px;">
                                        &copy; 2025 NovaFlow. All rights reserved.<br>
                                        <a href="#" style="color: #64748B; text-decoration: underline;">Privacy Policy</a> &bull; 
                                        <a href="#" style="color: #64748B; text-decoration: underline;">Terms of Service</a> &bull; 
                                        <a href="#" style="color: #64748B; text-decoration: underline;">Unsubscribe</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const templates = [
    {
        name: 'welcome-email',
        content: `
            <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 28px;">Welcome to NovaFlow! 👋</h1>
            <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Hi {{user_name}},<br><br>
                We're excited to have you on board. Start building, collaborating, and growing with powerful tools designed for modern teams.
            </p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                    <td align="center">
                        <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80" alt="Welcome Image" width="100%" style="border-radius: 8px; max-width: 100%;">
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#4F46E5" style="border-radius: 8px;">
                        <a href="{{dashboard_url}}" target="_blank" class="btn-primary" style="color: #ffffff;">Get Started</a>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                <tr>
                    <td align="center" style="color: #4F46E5; font-size: 14px; font-weight: 600; padding: 10px;">🚀 Fast Setup</td>
                    <td align="center" style="color: #4F46E5; font-size: 14px; font-weight: 600; padding: 10px;">🔒 Secure</td>
                    <td align="center" style="color: #4F46E5; font-size: 14px; font-weight: 600; padding: 10px;">💪 Powerful</td>
                </tr>
            </table>
        `
    },
    {
        name: 'email-verification',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Verify Your Email</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Use the verification code below to verify your email address.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #EEF2FF; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">🛡️</div>
                    </td>
                </tr>
            </table>
            
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                    <td align="center" bgcolor="#F8FAFC" style="padding: 20px; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 15px; color: #1E293B; border: 1px dashed #CBD5E1;">
                        {{otp_code}}
                    </td>
                </tr>
            </table>
            <p style="color: #94A3B8; font-size: 12px; margin: 0 0 20px 0;">This code will expire in 10 minutes.</p>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#4F46E5" style="border-radius: 8px;">
                        <a href="{{verify_url}}" target="_blank" class="btn-primary" style="color: #ffffff;">Verify Email</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'password-reset',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Reset Your Password</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            We received a request to reset your password.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #EEF2FF; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">🔓</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                    <td align="center" bgcolor="#4F46E5" style="border-radius: 8px;">
                        <a href="{{reset_url}}" target="_blank" class="btn-primary" style="color: #ffffff;">Reset Password</a>
                    </td>
                </tr>
            </table>
            <p style="color: #94A3B8; font-size: 14px; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
        `
    },
    {
        name: 'login-alert',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">New Login Detected</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            We noticed a new login to your account.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #ECFDF5; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">✅</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                    <td style="color: #475569; font-size: 14px; padding-bottom: 10px;"><strong>Device:</strong> {{device}}</td>
                </tr>
                <tr>
                    <td style="color: #475569; font-size: 14px; padding-bottom: 10px;"><strong>Location:</strong> {{location}}</td>
                </tr>
                <tr>
                    <td style="color: #475569; font-size: 14px;"><strong>Time:</strong> {{time}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#4F46E5" style="border-radius: 8px; padding-right: 10px;">
                        <a href="{{secure_url}}" target="_blank" class="btn-primary" style="color: #ffffff;">This Was Me</a>
                    </td>
                    <td align="center" bgcolor="#F3F4F6" style="border-radius: 8px;">
                        <a href="{{report_url}}" target="_blank" class="btn-secondary">Not Me</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'account-created',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Account Created Successfully! 🎉</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Your account has been created successfully.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #FEF3C7; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">🎊</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                    <td align="center" bgcolor="#4F46E5" style="border-radius: 8px;">
                        <a href="{{dashboard_url}}" target="_blank" class="btn-primary" style="color: #ffffff;">Explore Dashboard</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'order-confirmation',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Thank You for Your Order! 🛍️</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            We've received your order and it's now being processed.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #E0E7FF; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">📦</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                    <td style="color: #475569; font-size: 14px;"><strong>Order ID:</strong> {{order_id}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#4F46E5" style="border-radius: 8px;">
                        <a href="{{order_url}}" target="_blank" class="btn-primary" style="color: #ffffff;">View Order</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'payment-success',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Payment Successful! ✅</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Your payment was successful.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #DCFCE7; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">💸</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                    <td width="50%" style="color: #94A3B8; font-size: 12px; text-transform: uppercase;">Amount Paid</td>
                    <td width="50%" style="color: #94A3B8; font-size: 12px; text-transform: uppercase;">Transaction ID</td>
                </tr>
                <tr>
                    <td style="color: #10B981; font-size: 24px; font-weight: 700;">{{amount}}</td>
                    <td style="color: #1E293B; font-size: 16px; font-weight: 600;">{{transaction_id}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td align="center" bgcolor="#10B981" style="border-radius: 8px;">
                        <a href="{{receipt_url}}" target="_blank" class="btn-primary" style="background-color: #10B981; color: #ffffff; display: block; text-align: center;">View Receipt</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'payment-failed',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Payment Failed ❌</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            We couldn't process your payment.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #FEE2E2; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">⚠️</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                    <td width="50%" style="color: #94A3B8; font-size: 12px; text-transform: uppercase;">Amount</td>
                    <td width="50%" style="color: #94A3B8; font-size: 12px; text-transform: uppercase;">Reason</td>
                </tr>
                <tr>
                    <td style="color: #1E293B; font-size: 18px; font-weight: 700;">{{amount}}</td>
                    <td style="color: #EF4444; font-size: 16px; font-weight: 600;">Card Declined</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#EF4444" style="border-radius: 8px;">
                        <a href="{{payment_url}}" target="_blank" class="btn-danger">Update Payment Method</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'invoice-receipt',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Your Invoice is Ready 🧾</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Thank you for your business.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #E0F2FE; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">📄</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                    <td style="color: #64748B; font-size: 14px; padding-bottom: 10px;"><strong>Invoice ID:</strong> {{invoice_id}}</td>
                </tr>
                <tr>
                    <td style="color: #64748B; font-size: 12px; text-transform: uppercase; padding-top: 10px;">Total Amount</td>
                </tr>
                <tr>
                    <td style="color: #1E293B; font-size: 24px; font-weight: 700;">{{amount}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td align="center" bgcolor="#4F46E5" style="border-radius: 8px;">
                        <a href="{{invoice_url}}" target="_blank" class="btn-primary" style="display: block; text-align: center;">Download Invoice</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'subscription-activated',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Subscription Activated! 🎉</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Your subscription is now active.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #F3E8FF; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">💎</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                    <td width="50%" style="color: #64748B; font-size: 12px; text-transform: uppercase;">Plan</td>
                    <td width="50%" style="color: #64748B; font-size: 12px; text-transform: uppercase;">Next Billing</td>
                </tr>
                <tr>
                    <td style="color: #1E293B; font-size: 16px; font-weight: 600;">{{plan_name}}</td>
                    <td style="color: #1E293B; font-size: 16px; font-weight: 600;">{{next_billing_date}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#4F46E5" style="border-radius: 8px;">
                        <a href="{{manage_url}}" target="_blank" class="btn-primary">Manage Subscription</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'subscription-renewal',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Subscription Renewed! 🔄</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Your subscription has been renewed.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #E0F2FE; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">♻️</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                    <td width="50%" style="color: #94A3B8; font-size: 12px; text-transform: uppercase;">Amount</td>
                    <td width="50%" style="color: #94A3B8; font-size: 12px; text-transform: uppercase;">Next Billing</td>
                </tr>
                <tr>
                    <td style="color: #1E293B; font-size: 18px; font-weight: 700;">{{amount}}</td>
                    <td style="color: #1E293B; font-size: 16px; font-weight: 600;">{{next_billing_date}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td align="center" bgcolor="#0EA5E9" style="border-radius: 8px;">
                        <a href="{{manage_url}}" target="_blank" class="btn-primary" style="background-color: #0EA5E9; display: block; text-align: center;">View Subscription</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'trial-started',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Your Free Trial Started! 🚀</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            You now have access to all Pro features.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #DBEAFE; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">🌟</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                    <td style="color: #64748B; font-size: 12px; text-transform: uppercase;">Trial Ends</td>
                </tr>
                <tr>
                    <td style="color: #1E293B; font-size: 16px; font-weight: 600;">{{trial_end_date}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#2563EB" style="border-radius: 8px;">
                        <a href="{{features_url}}" target="_blank" class="btn-primary" style="background-color: #2563EB;">Explore Features</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'trial-expiring',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Your Trial is Ending Soon! ⏳</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Your trial will expire in 2 days.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #FFEDD5; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">⌛</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                    <td style="color: #64748B; font-size: 12px; text-transform: uppercase;">Trial Ends</td>
                </tr>
                <tr>
                    <td style="color: #1E293B; font-size: 16px; font-weight: 600;">{{trial_end_date}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#F97316" style="border-radius: 8px;">
                        <a href="{{upgrade_url}}" target="_blank" class="btn-primary" style="background-color: #F97316;">Upgrade Now</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'coupon-promo',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Special Offer Just for You! 🎁</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Enjoy this exclusive discount on your next purchase.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #FCE7F3; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">🏷️</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                    <td align="center" bgcolor="#FDF2F8" style="padding: 15px; border-radius: 8px; border: 2px dashed #EC4899; color: #BE185D; font-size: 24px; font-weight: 700; letter-spacing: 2px;">
                        {{coupon_code}}
                    </td>
                </tr>
            </table>
            <p style="color: #94A3B8; font-size: 14px; margin: 0 0 20px 0;">20% OFF on all plans</p>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#EC4899" style="border-radius: 8px;">
                        <a href="{{claim_url}}" target="_blank" class="btn-primary" style="background-color: #EC4899;">Claim Offer</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'shipping-update',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Your Order is on the Way! 🚚</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Good news! Your order has been shipped.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #D1FAE5; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">🚚</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                    <td style="color: #64748B; font-size: 12px; text-transform: uppercase; padding-bottom: 5px;">Tracking ID</td>
                </tr>
                <tr>
                    <td style="color: #1E293B; font-size: 16px; font-weight: 600;">{{tracking_id}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td align="center" bgcolor="#10B981" style="border-radius: 8px;">
                        <a href="{{track_url}}" target="_blank" class="btn-primary" style="background-color: #10B981; display: block; text-align: center;">Track Your Order</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'support-ticket',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Your Ticket Has Been Updated</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            There's an update on your support ticket.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #F3E8FF; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">💬</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                    <td style="color: #64748B; font-size: 14px;"><strong>Ticket ID:</strong> {{ticket_id}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#8B5CF6" style="border-radius: 8px;">
                        <a href="{{ticket_url}}" target="_blank" class="btn-primary" style="background-color: #8B5CF6;">View Ticket</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'contact-form-confirmation',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">We Received Your Message</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Thank you for reaching out. We'll get back to you shortly.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #DCFCE7; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">📩</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#10B981" style="border-radius: 8px;">
                        <a href="{{message_url}}" target="_blank" class="btn-primary" style="background-color: #10B981;">View Message</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'newsletter',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">This Month in NovaFlow 📰</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Here are the latest updates and articles.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #E0F2FE; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">🗞️</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                    <td align="center">
                        <img src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80" alt="Newsletter Image" width="100%" style="border-radius: 8px; max-width: 100%;">
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#0EA5E9" style="border-radius: 8px;">
                        <a href="{{newsletter_url}}" target="_blank" class="btn-primary" style="background-color: #0EA5E9;">Read Newsletter</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'referral-rewards',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Invite & Earn Rewards! 💰</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            Invite your friends and earn amazing rewards.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #FEF08A; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">🎁</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
                <tr>
                    <td align="center" bgcolor="#FEF9C3" style="padding: 15px; border-radius: 8px; border: 2px dashed #EAB308; color: #CA8A04; font-size: 20px; font-weight: 700; letter-spacing: 2px;">
                        {{referral_code}}
                    </td>
                </tr>
            </table>
            <p style="color: #64748B; font-size: 14px; margin: 0 0 20px 0; text-align: center;">You & your friend get 20% OFF</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td align="center" bgcolor="#EAB308" style="border-radius: 8px;">
                        <a href="{{invite_url}}" target="_blank" class="btn-primary" style="background-color: #EAB308; display: block; text-align: center;">Invite Now</a>
                    </td>
                </tr>
            </table>
        `
    },
    {
        name: 'security-notification',
        content: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td>
                        <h1 style="color: #1E293B; margin: 0 0 10px 0; font-size: 24px;">Security Alert 🚨</h1>
                        <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                            Hi {{user_name}},<br>
                            We detected suspicious activity on your account.
                        </p>
                    </td>
                    <td align="right" valign="top" width="60">
                        <div style="background-color: #FEE2E2; border-radius: 50%; padding: 10px; width: 40px; height: 40px; text-align: center;">🛡️</div>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                    <td style="color: #475569; font-size: 14px; padding-bottom: 10px;"><strong>Activity:</strong> Unusual Login Attempt</td>
                </tr>
                <tr>
                    <td style="color: #475569; font-size: 14px; padding-bottom: 10px;"><strong>Location:</strong> {{location}}</td>
                </tr>
                <tr>
                    <td style="color: #475569; font-size: 14px;"><strong>Time:</strong> {{time}}</td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td align="center" bgcolor="#EF4444" style="border-radius: 8px;">
                        <a href="{{secure_url}}" target="_blank" class="btn-danger" style="display: block; text-align: center;">Secure My Account</a>
                    </td>
                </tr>
            </table>
        `
    }
];

templates.forEach(template => {
    const html = baseTemplate(template.content);
    fs.writeFileSync(path.join(templatesDir, `${template.name}.html`), html);
    console.log(`Generated ${template.name}.html`);
});

console.log('All 20 email templates generated successfully.');
