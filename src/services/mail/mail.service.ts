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
}
