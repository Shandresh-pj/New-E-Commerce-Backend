import crypto from "crypto";
import dotenv from "dotenv";
import { TemplateRenderer } from "./templateRenderer";
import { EmailProvider } from "../services/email.Provider";

dotenv.config();

export function generateTempPassword() {
    return crypto
        .randomBytes(10)
        .toString("hex");
}

export class EmailService {

    static async verifyConnection() {
        await EmailProvider.verifyConnection();
    }

    // =======================================
    // Account Created / Welcome Email
    // =======================================

    static async sendTemporaryPassword(email: string, password: string, name: string) {
        const html = TemplateRenderer.renderTemplate('account-created', {
            user_name: name,
            password: password,
            dashboard_url: process.env.FRONTEND_URL || 'http://localhost:4200'
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: "Welcome to SVK E-Commerce — Your Workspace is Ready",
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // OTP / Email Verification
    // =======================================

    static async sendOtp(email: string, otp: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('email-verification', {
            user_name: 'User',
            otp_code: otp,
            verify_url: `${frontendUrl}/authentication/verify?otp=${otp}`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `${otp} is your SVK E-Commerce verification code`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Company Admin Email (Credentials)
    // =======================================

    static async sendCompanyAdminCredentials(email: string, password: string, token: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const verifyUrl = `${frontendUrl}/authentication/verify/${token}`;
        const html = TemplateRenderer.renderTemplate('account-created', {
            user_name: 'Admin',
            password: password,
            dashboard_url: verifyUrl
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: "SVK E-Commerce — Company Admin Account Created",
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Registration Email Verification Link
    // =======================================

    static async sendRegistrationVerification(email: string, ownerName: string, verifyUrl: string) {
        const html = TemplateRenderer.renderTemplate('email-verification', {
            user_name: ownerName,
            otp_code: 'VERIFY',
            verify_url: verifyUrl
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: "Verify your SVK E-Commerce account registration",
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Trial Approval (Post Super-Admin Approval)
    // =======================================

    static async sendTrialApproval(email: string, ownerName: string, preferredPlan: string, setupUrl: string) {
        const html = TemplateRenderer.renderTemplate('trial-started', {
            user_name: ownerName,
            preferred_plan: preferredPlan,
            setup_url: setupUrl
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: "SVK E-Commerce Registration Approved — Account Setup",
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Password Reset (Token Link)
    // =======================================

    static async sendPasswordReset(email: string, resetToken: string, name: string = 'User') {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const resetUrl = `${frontendUrl}/authentication/reset-password/${resetToken}`;
        const html = TemplateRenderer.renderTemplate('password-reset', {
            user_name: name,
            reset_url: resetUrl
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: "Password Reset Request — SVK E-Commerce",
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // Alias for legacy usage
    static async sendPasswordResetLink(email: string, resetLink: string) {
        const html = TemplateRenderer.renderTemplate('password-reset', {
            user_name: 'User',
            reset_url: resetLink
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: "Password Reset Request — SVK E-Commerce",
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Login Alert / Security
    // =======================================

    static async sendLoginAlert(
        email: string,
        name: string = 'User',
        ipAddress: string = 'Unknown',
        location: string = 'Unknown'
    ) {
        const html = TemplateRenderer.renderTemplate('login-alert', {
            user_name: name,
            ip_address: ipAddress,
            location: location,
            time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: "Security Notice: New login detected on your SVK E-Commerce account",
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Security Notification
    // =======================================

    static async sendSecurityAlert(
        email: string,
        name: string,
        alertType: string,
        ipAddress: string = 'Unknown'
    ) {
        const html = TemplateRenderer.renderTemplate('security-notification', {
            user_name: name,
            alert_type: alertType,
            ip_address: ipAddress,
            time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: "Security Notice: Account activity alert — SVK E-Commerce",
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Payment Success
    // =======================================

    static async sendPaymentSuccess(
        email: string,
        amount: string,
        transactionId: string,
        name: string = 'Customer'
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('payment-success', {
            user_name: name,
            amount: amount,
            transaction_id: transactionId,
            receipt_url: `${frontendUrl}/dashboard/billing`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Payment Receipt: ₹${amount} — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Payment Failed
    // =======================================

    static async sendPaymentFailed(
        email: string,
        amount: string,
        transactionId: string,
        name: string = 'Customer'
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('payment-failed', {
            user_name: name,
            amount: amount,
            transaction_id: transactionId,
            retry_url: `${frontendUrl}/dashboard/billing`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Payment Status: Transaction failed for ₹${amount} — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Subscription Activated
    // =======================================

    static async sendSubscriptionActivated(
        email: string,
        name: string,
        planName: string,
        billingCycle: string,
        startDate: string,
        renewalDate: string
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('subscription-activated', {
            user_name: name,
            plan_name: planName,
            billing_cycle: billingCycle,
            start_date: startDate,
            renewal_date: renewalDate,
            dashboard_url: `${frontendUrl}/dashboard`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Subscription Confirmed: ${planName} Plan — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Subscription Renewal Reminder
    // =======================================

    static async sendSubscriptionRenewalReminder(
        email: string,
        name: string,
        planName: string,
        renewalDate: string,
        amount: string
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('subscription-renewal', {
            user_name: name,
            plan_name: planName,
            renewal_date: renewalDate,
            amount: amount,
            manage_url: `${frontendUrl}/dashboard/billing`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Subscription Notice: Upcoming renewal for ${planName} Plan — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Trial Expiring
    // =======================================

    static async sendTrialExpiring(
        email: string,
        name: string,
        daysRemaining: number,
        expiryDate: string
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('trial-expiring', {
            user_name: name,
            days_remaining: String(daysRemaining),
            expiry_date: expiryDate,
            upgrade_url: `${frontendUrl}/dashboard/plans`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Subscription Notice: Your trial expires in ${daysRemaining} days — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Contact Form Confirmation
    // =======================================

    static async sendContactFormConfirmation(email: string, name: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('contact-form-confirmation', {
            user_name: name,
            message_url: frontendUrl
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: "We've received your message — SVK E-Commerce Support",
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Order Confirmation
    // =======================================

    static async sendOrderConfirmation(
        email: string,
        name: string,
        orderId: string,
        itemCount: number,
        orderTotal: string,
        deliveryDate: string
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('order-confirmation', {
            user_name: name,
            order_id: orderId,
            item_count: String(itemCount),
            order_total: orderTotal,
            delivery_date: deliveryDate,
            order_url: `${frontendUrl}/orders/${orderId}`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Order Confirmation #${orderId} — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Support Ticket Created
    // =======================================

    static async sendSupportTicketCreated(
        email: string,
        name: string,
        ticketId: string,
        subject: string,
        priority: string = 'Normal'
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('support-ticket', {
            user_name: name,
            ticket_id: ticketId,
            ticket_subject: subject,
            priority: priority,
            ticket_url: `${frontendUrl}/support/tickets/${ticketId}`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Support Ticket #${ticketId} Created — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Welcome Email (Onboarding)
    // =======================================

    static async sendWelcomeEmail(email: string, name: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('welcome-email', {
            user_name: name,
            dashboard_url: `${frontendUrl}/dashboard`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Welcome to SVK E-Commerce, ${name}! 🎉`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Shipping Update
    // =======================================

    static async sendShippingUpdate(
        email: string,
        name: string,
        orderId: string,
        shippingStatus: string,
        trackingNumber: string,
        carrierName: string,
        deliveryDate: string,
        trackingUrl: string
    ) {
        const html = TemplateRenderer.renderTemplate('shipping-update', {
            user_name: name,
            order_id: orderId,
            shipping_status: shippingStatus,
            tracking_number: trackingNumber,
            carrier_name: carrierName,
            delivery_date: deliveryDate,
            tracking_url: trackingUrl
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Shipping Update: Order #${orderId} — ${shippingStatus}`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Referral Rewards
    // =======================================

    static async sendReferralReward(
        email: string,
        name: string,
        referredUser: string,
        rewardAmount: string,
        referralCode: string,
        totalRewards: string
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('referral-rewards', {
            user_name: name,
            referred_user: referredUser,
            reward_amount: rewardAmount,
            referral_code: referralCode,
            total_rewards: totalRewards,
            referral_url: `${frontendUrl}/dashboard/referrals`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `🎉 Referral Reward Earned! ${referredUser} joined using your code — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Coupon Promo (Marketing)
    // =======================================

    static async sendCouponPromo(
        email: string,
        name: string,
        couponCode: string,
        discountValue: string,
        expiryDate: string
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('coupon-promo', {
            user_name: name,
            coupon_code: couponCode,
            discount_value: discountValue,
            expiry_date: expiryDate,
            shop_url: `${frontendUrl}/dashboard/plans`,
            unsubscribe_url: `${frontendUrl}/unsubscribe?email=${email}`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `🎁 Exclusive Offer: Use ${couponCode} and save ${discountValue} — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Invoice Receipt
    // =======================================

    static async sendInvoiceReceipt(
        email: string,
        invoiceId: string,
        invoiceDate: string,
        dueDate: string,
        customerName: string,
        customerEmail: string,
        item1Name: string,
        item1Qty: string,
        item1Amount: string,
        subtotal: string,
        taxRate: string,
        taxAmount: string,
        totalAmount: string,
        invoiceUrl: string
    ) {
        const html = TemplateRenderer.renderTemplate('invoice-receipt', {
            invoice_id: invoiceId,
            invoice_date: invoiceDate,
            due_date: dueDate,
            customer_name: customerName,
            customer_email: customerEmail,
            item_1_name: item1Name,
            item_1_qty: item1Qty,
            item_1_amount: item1Amount,
            subtotal: subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            invoice_url: invoiceUrl
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `Invoice #${invoiceId} — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }

    // =======================================
    // Newsletter
    // =======================================

    static async sendNewsletter(
        email: string,
        name: string,
        newsletterTitle: string,
        newsletterSubtitle: string,
        featureTitle: string,
        featureDescription: string,
        update1: string,
        update2: string,
        update3: string,
        ctaText: string,
        ctaUrl: string
    ) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const html = TemplateRenderer.renderTemplate('newsletter', {
            user_name: name,
            newsletter_title: newsletterTitle,
            newsletter_subtitle: newsletterSubtitle,
            feature_title: featureTitle,
            feature_description: featureDescription,
            update_1: update1,
            update_2: update2,
            update_3: update3,
            cta_text: ctaText,
            cta_url: ctaUrl,
            unsubscribe_url: `${frontendUrl}/unsubscribe?email=${email}`
        });

        EmailProvider.sendWithRetry({
            to: email,
            subject: `${newsletterTitle} — SVK E-Commerce`,
            html
        }).catch(err => console.error("[Email] Background send error:", err.message));
    }
}