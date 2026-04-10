/**
 * emailService.js
 * Uses Nodemailer + Gmail SMTP (free, reliable).
 * Requires a Gmail App Password (2FA must be ON).
 * 
 * To create an App Password:
 *   1. Go to https://myaccount.google.com/security
 *   2. Enable 2-Step Verification
 *   3. Go to "App passwords" → Generate for "Mail"
 *   4. Copy the 16-char password → GMAIL_APP_PASSWORD in .env
 */
const nodemailer = require('nodemailer');
require('dotenv').config();

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Sends a 6-digit OTP to the user's email.
 */
const sendOtpEmail = async (toEmail, otp) => {
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        body { font-family:'Segoe UI',Arial,sans-serif; background:#f7f7f8; margin:0; padding:40px 20px; }
        .card { max-width:480px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
        .head { background:linear-gradient(135deg,#e63946,#c1121f); padding:32px; text-align:center; }
        .head h1 { margin:0; color:#fff; font-size:22px; font-weight:800; }
        .body { padding:32px; }
        .body p  { color:#555; font-size:15px; line-height:1.7; margin:0 0 20px; }
        .otp-box { background:#fff5f5; border:2px solid #fca5a5; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px; }
        .otp     { font-size:38px; font-weight:900; letter-spacing:12px; color:#e63946; }
        .expiry  { font-size:12px; color:#f97316; margin-top:8px; font-weight:600; }
        .footer  { padding:20px 32px; border-top:1px solid #f0f0f0; font-size:12px; color:#aaa; text-align:center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="head"><h1>🍔 QuickBite Security</h1></div>
        <div class="body">
          <p>We detected a login attempt. Use the code below to verify your identity.</p>
          <div class="otp-box">
            <div class="otp">${otp}</div>
            <div class="expiry">⏱ Expires in 5 minutes</div>
          </div>
          <p>If you didn't request this, you can safely ignore this email. Your account remains secure.</p>
        </div>
        <div class="footer">QuickBite · Do not share this code with anyone</div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"QuickBite" <${process.env.GMAIL_USER}>`,
      to:      toEmail,
      subject: '🔐 Your QuickBite Verification Code',
      html,
    });
    console.log(`✅ OTP email sent to ${toEmail}`);
  } catch (err) {
    console.error('❌ Gmail SMTP failed:', err.message);
    console.warn(`⚠️  [DEV FALLBACK] OTP for ${toEmail} is: ${otp}`);
  }
};

/**
 * Sends the Seller Approval email with magic link.
 */
const sendApprovalEmail = async ({ toEmail, sellerName, businessName, magicUrl }) => {
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        body { font-family:'Segoe UI',Arial,sans-serif; background:#f7f7f8; margin:0; padding:40px 20px; }
        .card { max-width:520px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
        .head { background:#e63946; padding:32px; text-align:center; }
        .head h1 { margin:0; color:#fff; font-size:22px; font-weight:800; }
        .head p  { margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:14px; }
        .body { padding:32px; }
        .body h2 { margin:0 0 12px; font-size:20px; color:#111; }
        .body p  { color:#555; font-size:15px; line-height:1.7; margin:0 0 16px; }
        .highlight { background:#fff5f5; border-left:4px solid #e63946; padding:12px 16px; border-radius:0 8px 8px 0; margin-bottom:20px; font-size:14px; }
        .btn { display:block; width:fit-content; margin:0 auto; padding:14px 32px; background:#e63946; color:#fff; font-weight:700; text-decoration:none; border-radius:10px; font-size:16px; }
        .footer { padding:20px 32px; border-top:1px solid #f0f0f0; font-size:12px; color:#aaa; text-align:center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="head">
          <h1>🍔 QuickBite Seller Platform</h1>
          <p>Official Seller Approval Notice</p>
        </div>
        <div class="body">
          <h2>🎉 Congratulations, ${sellerName || 'Seller'}!</h2>
          <div class="highlight">
            <strong>Business:</strong> ${businessName}<br/>
            <strong>Status:</strong> ✅ Approved by Company
          </div>
          <p>We are pleased to inform you that your seller application on <strong>QuickBite</strong> has been <strong>approved by the company</strong>.</p>
          <p>You can now log in to your seller dashboard to manage your products, view orders, and track payouts.</p>
          <div style="text-align:center; margin:28px 0;">
            <a href="${magicUrl}" class="btn">Activate Account &amp; Open Dashboard →</a>
          </div>
          <p style="font-size:13px; color:#aaa; text-align:center;">This secure activation link expires in <strong>24 hours</strong>. Do not share it with anyone.</p>
        </div>
        <div class="footer">QuickBite · Seller Approval System · © 2026</div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from:    `"QuickBite Team" <${process.env.GMAIL_USER}>`,
      to:      toEmail,
      subject: `✅ ${businessName} — Seller Account Approved!`,
      html,
    });
    console.log(`✅ Approval email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error('❌ Gmail SMTP failed (approval):', err.message);
    console.warn(`⚠️  [DEV FALLBACK] Magic link for ${toEmail}: ${magicUrl}`);
    return false;
  }
};

module.exports = { sendOtpEmail, sendApprovalEmail };
