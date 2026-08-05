import nodemailer from 'nodemailer';
import env from './env.js';

let transporter = null;

export const getEmailTransporter = () => {
  if (!env.smtp.host || !env.smtp.port || !env.smtp.user || !env.smtp.pass) {
    console.warn('SMTP is not configured. Email functionality will be disabled.');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure || false,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }

  return transporter;
};

export const sendVerificationEmail = async (email, code) => {
  const transporter = getEmailTransporter();
  
  if (!transporter) {
    console.log(`[DEV MODE] Verification code for ${email}: ${code}`);
    return { success: true, devMode: true };
  }

  try {
    await transporter.sendMail({
      from: env.smtp.from || env.smtp.user,
      to: email,
      subject: 'Premedi Lanka - Password Reset Verification Code',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Verification Code</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border:1px solid #e2e2e2; border-radius:4px; overflow:hidden;">

          <!-- Logo -->
          <tr>
            <td style="padding:24px 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    ${env.smtp.logoUrl ? `<img src="${env.smtp.logoUrl}" alt="Cardiac Care Logo" width="34" height="34" style="display:block; border-radius:50%;">` : `
                    <svg width="34" height="34" viewBox="0 0 34 34">
                      <circle cx="17" cy="17" r="17" fill="#10b981"/>
                      <path d="M10 20 L17 10 L24 20" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="17" cy="23" r="1.8" fill="#ffffff"/>
                    </svg>`}
                  </td>
                  <td style="padding-left:8px; vertical-align:middle;">
                    <span style="font-size:18px; font-weight:700; color:#1a1a2e; letter-spacing:0.5px;">Cardiac Care</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:8px 32px 0 32px; font-size:14px; color:#222222;">
              Hi there,
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 0 32px; font-size:14px; color:#222222; line-height:1.5;">
              Please use the verification code below on the Cardiac Care portal to confirm your identity and reset your password.
            </td>
          </tr>

          <!-- Code box -->
          <tr>
            <td style="padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaf3fb; border-radius:4px;">
                <tr>
                  <td align="center" style="padding:20px 10px 6px 10px; font-size:13px; color:#333333; font-weight:600;">
                    Verification Code:
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 10px 6px 10px; font-size:30px; letter-spacing:4px; font-weight:700; color:#111111;">
                    ${code}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 10px 20px 10px; font-size:12px; color:#555555;">
                    (This code will expire in 15 minutes)
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Info text -->
          <tr>
            <td style="padding:0 32px 4px 32px; font-size:13px; color:#333333; line-height:1.6;">
              If you did not request this password reset, please ignore this email. Your account remains secure.
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:20px 32px 0 32px;">
              <hr style="border:none; border-top:1px solid #e6e6e6;">
            </td>
          </tr>

          <!-- Security notice -->
          <tr>
            <td style="padding:16px 32px 24px 32px; font-size:12px; color:#666666; line-height:1.6;">
              Cardiac Care will never email you and ask you to disclose or verify your password, credit card, or banking account number. If you receive a suspicious email with a link to update your account information, do not click on the link. Instead, report the email to Cardiac Care for investigation.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa; padding:16px 32px; text-align:center; font-size:11px; color:#999999; border-top:1px solid #eeeeee;">
              Do not reply to this message. This mailbox is not monitored.<br>
              Thank you for using Cardiac Care.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};

export default getEmailTransporter;
