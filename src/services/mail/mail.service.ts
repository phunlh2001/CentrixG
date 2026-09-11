import { CONFIG_ENV } from '@app/common/constants';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>(CONFIG_ENV.resendApiKey, '');
    this.fromAddress = this.config.get<string>(CONFIG_ENV.resendFromEmail, '');

    this.resend = new Resend(apiKey);
    this.logger.log('MailService initialized.');
  }

  /**
   * Sends a 6-digit HTML verification email to the newly registered user.
   */
  async sendVerificationCode(
    toEmail: string,
    username: string,
    code: string,
  ): Promise<boolean> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code - Centrix Gaming</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                CENTRIX GAMING
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; color: #e0e7ff; font-weight: 500;">
                Steam Catalog & Game Rental Platform
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 32px; text-align: left;">
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                Welcome, ${username}! 👋
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                Thank you for creating an account with <strong style="color: #60a5fa;">Centrix Gaming</strong>. To complete your registration and verify your email address, please use the 6-digit verification code below:
              </p>

              <!-- Code Box -->
              <div style="margin: 32px 0; text-align: center;">
                <div style="display: inline-block; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px dashed #3b82f6; border-radius: 12px; padding: 18px 36px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #60a5fa; text-shadow: 0 0 12px rgba(59, 130, 246, 0.5);">
                    ${code}
                  </span>
                </div>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 14px; color: #9ca3af; line-height: 1.5;">
                ⏱️ This code will expire in <strong>10 minutes</strong>. Please do not share this code with anyone.
              </p>
              
              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1f2937; font-size: 13px; color: #6b7280; line-height: 1.5;">
                <p style="margin: 0;">
                  If you did not create a Centrix Gaming account, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                &copy; ${new Date().getFullYear()} Centrix Gaming Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: [toEmail],
        subject: '[Centrix Gaming] Your Verification Code',
        html: htmlContent,
      });

      if (error) {
        this.logger.error(
          `Failed to send verification code to ${toEmail}: ${error.message}`,
        );
        throw new Error(error.message);
      }

      this.logger.log(`Verification code sent successfully to ${toEmail}.`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send verification code to ${toEmail}.`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sends a 6-character HTML verification email for password reset.
   */
  async sendResetPasswordCode(
    toEmail: string,
    username: string,
    code: string,
  ): Promise<boolean> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code - Centrix Gaming</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                CENTRIX GAMING
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; color: #e0e7ff; font-weight: 500;">
                Password Reset Verification
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 32px; text-align: left;">
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                Hello, ${username}! 🔒
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                We received a request to reset the password for your <strong style="color: #60a5fa;">Centrix Gaming</strong> account. Please use the 6-character verification code below to complete your password reset:
              </p>

              <!-- Code Box -->
              <div style="margin: 32px 0; text-align: center;">
                <div style="display: inline-block; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px dashed #ef4444; border-radius: 12px; padding: 18px 36px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #f87171; text-shadow: 0 0 12px rgba(239, 68, 68, 0.5);">
                    ${code}
                  </span>
                </div>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 14px; color: #9ca3af; line-height: 1.5;">
                ⏱️ This code will expire in <strong>10 minutes</strong>. Never share this code with anyone.
              </p>
              
              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1f2937; font-size: 13px; color: #6b7280; line-height: 1.5;">
                <p style="margin: 0;">
                  If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized access.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                &copy; ${new Date().getFullYear()} Centrix Gaming Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: [toEmail],
        subject: '[Centrix Gaming] Password Reset Verification Code',
        html: htmlContent,
      });

      if (error) {
        this.logger.error(
          `Failed to send password reset code to ${toEmail}: ${error.message}`,
        );
        throw new Error(error.message);
      }

      this.logger.log(`Password reset code sent successfully to ${toEmail}.`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset code to ${toEmail}.`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sends an account suspension notification email to the user.
   */
  async sendAccountSuspensionEmail(
    toEmail: string,
    username: string,
    reason: string,
  ): Promise<boolean> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Status Notification - Centrix Games Rental</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 36px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                Centrix Games Rental
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">
                Account Status Notification
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; text-align: left;">
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #1e293b;">
                Hello <strong>${username}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                We are writing to inform you that your account associated with <strong>${toEmail}</strong> has been suspended from the Centrix Rental Games platform.
              </p>

              <!-- Reason Box -->
              <div style="margin: 24px 0; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px 8px 8px 4px; padding: 16px 20px;">
                <div style="font-size: 14px; font-weight: 700; color: #991b1b; margin-bottom: 6px;">
                  Reason for Suspension:
                </div>
                <div style="font-size: 14px; color: #b91c1c; line-height: 1.5;">
                  ${reason}
                </div>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                During this suspension period, active game key credentials and cloud save access will be revoked.
              </p>

              <p style="margin: 0 0 32px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                If you believe this action was taken in error, you may reply directly to this email or contact support at <a href="mailto:support@centrix.games" style="color: #0f172a; font-weight: 600; text-decoration: underline;">support@centrix.games</a>.
              </p>

              <!-- Footer -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  &copy; ${new Date().getFullYear()} Centrix Games Rental Ltd. All rights reserved.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: [toEmail],
        subject: '[Centrix Games Rental] Account Status Notification - Suspended',
        html: htmlContent,
      });

      if (error) {
        this.logger.error(
          `Failed to send account suspension email to ${toEmail}: ${error.message}`,
        );
        return false;
      }

      this.logger.log(
        `Account suspension email sent successfully to ${toEmail}.`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send account suspension email to ${toEmail}.`,
        error,
      );
      return false;
    }
  }
}

