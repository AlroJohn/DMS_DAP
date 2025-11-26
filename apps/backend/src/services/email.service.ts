import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface PasswordResetEmailData {
  email: string;
  resetUrl: string;
  userName?: string;
  expiresIn: string; // e.g., "1 hour"
}

export interface InvitationEmailData {
  email: string;
  firstName: string;
  lastName: string;
  invitationUrl: string;
  inviterName: string;
  departmentName: string;
  roleName: string;
  expiresIn: string; // e.g., "7 days"
  companyName?: string;
}

/**
 * Interface for document shared notification data
 */
export interface DocumentSharedEmailData {
  recipientEmail: string;
  recipientName: string;
  documentTitle: string;
  sharedBy: string;
  documentUrl: string;
  message?: string;
  companyName?: string;
}

/**
 * Interface for document released notification data
 */
export interface DocumentReleasedEmailData {
  recipientEmail: string;
  recipientName: string;
  documentTitle: string;
  releasedBy: string;
  fromDepartment: string;
  documentUrl: string;
  message?: string;
  companyName?: string;
}

/**
 * Interface for document completed notification data
 */
export interface DocumentCompletedEmailData {
  recipientEmail: string;
  recipientName: string;
  documentTitle: string;
  completedBy: string;
  documentUrl: string;
  message?: string;
  companyName?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: data.email,
        subject: 'Secure Your Account: Password Reset Required',
        html: this.generatePasswordResetEmailHTML(data),
        text: this.generatePasswordResetEmailText(data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send user invitation email
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    try {
      const companyName = data.companyName || 'Document Management System';
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: data.email,
        subject: `Join ${companyName}: Your Invitation Awaits Inside`,
        html: this.generateInvitationEmailHTML(data),
        text: this.generateInvitationEmailText(data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Invitation email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return false;
    }
  }

  /**
   * Generate HTML email template for password reset
   */
  private generatePasswordResetEmailHTML(data: PasswordResetEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Secure Your Account: Password Reset Required</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f6f9fc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f6f9fc;
          }
          .email-content { 
            background-color: #ffffff; 
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .header { 
            background: linear-gradient(135deg, #007bff, #0056b3); 
            padding: 30px; 
            text-align: center; 
            color: white;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .main-content { 
            padding: 40px 30px; 
          }
          .welcome-message {
            text-align: center;
            margin-bottom: 30px;
          }
          .welcome-message h1 {
            color: #007bff;
            margin-top: 0;
          }
          .content-text {
            margin-bottom: 25px;
          }
          .content-text p {
            margin: 0 0 15px 0;
            font-size: 16px;
            line-height: 1.6;
          }
          .action-button { 
            display: block; 
            width: 220px;
            padding: 16px; 
            background: linear-gradient(135deg, #007bff, #0056b3); 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 25px auto;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(0, 123, 255, 0.2);
          }
          .action-button:hover {
            background: linear-gradient(135deg, #0056b3, #004085); 
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0, 123, 255, 0.3);
          }
          .link-container {
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            word-break: break-all; 
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .security-note { 
            background: #fff5f5; 
            border-left: 4px solid #e74c3c; 
            padding: 15px; 
            border-radius: 0 8px 8px 0; 
            margin: 25px 0;
          }
          .security-note h3 {
            color: #e74c3c;
            margin-top: 0;
          }
          .security-note ul {
            padding-left: 20px;
            margin: 10px 0;
          }
          .security-note li {
            margin-bottom: 8px;
          }
          .footer { 
            background-color: #f8f9fa; 
            padding: 25px 30px; 
            text-align: center; 
            font-size: 14px; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef;
          }
          .footer-links {
            margin: 15px 0;
          }
          .footer-links a {
            color: #007bff;
            text-decoration: none;
            margin: 0 10px;
          }
          .footer-links a:hover {
            text-decoration: underline;
          }
          .divider {
            height: 1px;
            background-color: #e9ecef;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-content">
            <div class="header">
              <div class="logo">Document Management System</div>
              <h1>Secure Your Account</h1>
            </div>
            <div class="main-content">
              <div class="welcome-message">
                <h1>Password Reset Required</h1>
              </div>
              
              <div class="content-text">
                <p>Hello${data.userName ? ` ${data.userName}` : ''},</p>
                
                <p>We received a request to reset the password for your Document Management System account.</p>
                
                <p><strong>To reset your password, please click the button below:</strong></p>
              </div>
              
              <div style="text-align: center;">
                <a href="${data.resetUrl}" class="action-button">Reset My Password</a>
              </div>
              
              <div class="content-text">
                <p>Alternatively, you can copy and paste this link into your browser:</p>
                <div class="link-container">${data.resetUrl}</div>
              </div>

              <div class="security-note">
                <h3>Important Security Information</h3>
                <ul>
                  <li>This password reset link will expire in ${data.expiresIn}</li>
                  <li>If you didn't request this password reset, please disregard this email and take no action</li>
                  <li>For security purposes, this link is valid for one-time use only</li>
                  <li>After resetting your password, you'll be automatically logged into your account</li>
                </ul>
              </div>
              
              <div class="content-text">
                <p>If you continue to experience issues, please contact our support team at support@yourcompany.com.</p>
              </div>
            </div>
            <div class="footer">
              <div class="footer-links">
                <a href="#" style="color: #007bff;">Privacy Policy</a> |
                <a href="#" style="color: #007bff;">Terms of Service</a> |
                <a href="#" style="color: #007bff;">Contact Support</a>
              </div>
              <div class="divider"></div>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Document Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email for password reset
   */
  private generatePasswordResetEmailText(data: PasswordResetEmailData): string {
    return `
SECURE YOUR ACCOUNT: PASSWORD RESET REQUIRED

Hello${data.userName ? ` ${data.userName}` : ''},

We received a request to reset the password for your Document Management System account.

To reset your password, visit the following link:
${data.resetUrl}

IMPORTANT SECURITY INFORMATION:
- This password reset link will expire in ${data.expiresIn}
- If you didn't request this password reset, please disregard this email and take no action
- For security purposes, this link is valid for one-time use only
- After resetting your password, you'll be automatically logged into your account

If you continue to experience issues, please contact our support team at support@yourcompany.com.

This is an automated message. Please do not reply to this email.

© ${new Date().getFullYear()} Document Management System. All rights reserved.
    `.trim();
  }

  /**
   * Generate HTML email template for user invitation
   */
  private generateInvitationEmailHTML(data: InvitationEmailData): string {
    const companyName = data.companyName || 'Document Management System';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Join ${companyName}: Your Invitation Awaits Inside</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f6f9fc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f6f9fc;
          }
          .email-content { 
            background-color: #ffffff; 
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .header { 
            background: #14298c; 
            padding: 30px; 
            text-align: center; 
            color: white;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .main-content { 
            padding: 40px 30px; 
          }
          .welcome-message {
            text-align: center;
            margin-bottom: 30px;
          }
          .welcome-message h1 {
            color: #14298c;
            margin-top: 0;
          }
          .content-text {
            margin-bottom: 25px;
          }
          .content-text p {
            margin: 0 0 15px 0;
            font-size: 16px;
            line-height: 1.6;
          }
          .account-details {
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #14298c;
          }
          .account-details h3 {
            margin-top: 0;
            color: #495057;
          }
          .detail-item {
            display: flex;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-item:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: bold;
            color: #495057;
            width: 120px;
            flex-shrink: 0;
          }
          .detail-value {
            flex-grow: 1;
            color: #6c757d;
          }
          .cta-button { 
            display: block; 
            width: 300px;
            padding: 16px; 
            background: #14298c; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 25px auto;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(20, 41, 140, 0.2);
          }
          .cta-button:hover {
            background: #0f1f69; 
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(20, 41, 140, 0.3);
          }
          .link-container {
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            word-break: break-all; 
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .expiration-note { 
            background: #e7f3ff; 
            border-left: 4px solid #007bff; 
            padding: 15px; 
            border-radius: 0 8px 8px 0; 
            margin: 25px 0;
          }
          .expiration-note h3 {
            color: #007bff;
            margin-top: 0;
          }
          .expiration-note ul {
            padding-left: 20px;
            margin: 10px 0;
          }
          .expiration-note li {
            margin-bottom: 8px;
          }
          .benefits-section {
            background: #f0f8ff;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            border: 1px dashed #007bff;
          }
          .benefits-section h3 {
            color: #007bff;
            text-align: center;
            margin-top: 0;
          }
          .benefits-section ul {
            padding-left: 20px;
          }
          .benefits-section li {
            margin-bottom: 10px;
          }
          .footer { 
            background-color: #f8f9fa; 
            padding: 25px 30px; 
            text-align: center; 
            font-size: 14px; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef;
          }
          .footer-links {
            margin: 15px 0;
          }
          .footer-links a {
            color: #007bff;
            text-decoration: none;
            margin: 0 10px;
          }
          .footer-links a:hover {
            text-decoration: underline;
          }
          .divider {
            height: 1px;
            background-color: #e9ecef;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-content">
            <div class="header">
              <div class="logo">${companyName}</div>
              <h1>Join ${companyName}</h1>
            </div>
            <div class="main-content">
              <div class="welcome-message">
                <h1>You're Invited to Join ${companyName}!</h1>
              </div>
              
              <div class="content-text">
                <p>Hello ${data.firstName} ${data.lastName},</p>
                
                <p>You have been invited by <strong>${data.inviterName}</strong> to join <strong>${companyName}</strong>. We're excited to welcome you to our platform!</p>
                
                <p>As a new team member, you'll have access to:</p>
              </div>
              
              <div class="benefits-section">
                <h3>Platform Benefits</h3>
                <ul>
                  <li>Centralized document management and version control</li>
                  <li>Secure access to company documents with role-based permissions</li>
                  <li>Collaboration tools and real-time document sharing</li>
                  <li>Comprehensive audit trail for document activities</li>
                </ul>
              </div>
              
              <div class="content-text">
                <p><strong>Your Account Details:</strong></p>
              </div>
              
              <div class="account-details">
                <div class="detail-item">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">${data.email}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Department:</span>
                  <span class="detail-value">${data.departmentName}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Role:</span>
                  <span class="detail-value">${data.roleName}</span>
                </div>
              </div>
              
              <div class="content-text">
                <p>To complete your registration and get started with ${companyName}, please click the button below:</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${data.invitationUrl}" class="cta-button">Accept Invitation & Create Account</a>
              </div>
              
              <div class="content-text">
                <p>Alternatively, you can copy and paste this link into your browser:</p>
                <div class="link-container">${data.invitationUrl}</div>
              </div>

              <div class="expiration-note">
                <h3>Important Information</h3>
                <ul>
                  <li>This invitation will expire in ${data.expiresIn}</li>
                  <li>You'll be able to set up your password, security preferences, and complete your profile</li>
                  <li>If you have any questions, please contact your administrator or our support team at support@yourcompany.com</li>
                </ul>
              </div>
              
              <div class="content-text">
                <p>We're looking forward to having you join our team. If you have any questions about ${companyName} or need any assistance during the setup process, please don't hesitate to reach out.</p>
              </div>
            </div>
            <div class="footer">
              <div class="footer-links">
                <a href="#" style="color: #007bff;">Privacy Policy</a> |
                <a href="#" style="color: #007bff;">Terms of Service</a> |
                <a href="#" style="color: #007bff;">Contact Support</a>
              </div>
              <div class="divider"></div>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email for user invitation
   */
  private generateInvitationEmailText(data: InvitationEmailData): string {
    const companyName = data.companyName || 'Document Management System';
    return `
JOIN ${companyName}: YOUR INVITATION AWAITS INSIDE

Hello ${data.firstName} ${data.lastName},

You have been invited by ${data.inviterName} to join ${companyName}. We're excited to welcome you to our platform!

AS A NEW TEAM MEMBER, YOU'LL HAVE ACCESS TO:
- Centralized document management and version control
- Secure access to company documents with role-based permissions
- Collaboration tools and real-time document sharing
- Comprehensive audit trail for document activities

YOUR ACCOUNT DETAILS:
- Email: ${data.email}
- Department: ${data.departmentName}
- Role: ${data.roleName}

To complete your registration and get started with ${companyName}, visit the following link:
${data.invitationUrl}

IMPORTANT INFORMATION:
- This invitation will expire in ${data.expiresIn}
- You'll be able to set up your password, security preferences, and complete your profile
- If you have any questions, please contact your administrator or our support team at support@yourcompany.com

We're looking forward to having you join our team. If you have any questions about ${companyName} or need any assistance during the setup process, please don't hesitate to reach out.

This is an automated message. Please do not reply to this email.

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
    `.trim();
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }

  /**
   * Send document shared notification email
   */
  async sendDocumentSharedEmail(data: DocumentSharedEmailData): Promise<boolean> {
    try {
      const companyName = data.companyName || 'Document Management System';
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: data.recipientEmail,
        subject: `New Document Shared with You: ${data.documentTitle}`,
        html: this.generateDocumentSharedEmailHTML(data),
        text: this.generateDocumentSharedEmailText(data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Document shared email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending document shared email:', error);
      return false;
    }
  }

  /**
   * Send document released notification email 
   */
  async sendDocumentReleasedEmail(data: DocumentReleasedEmailData): Promise<boolean> {
    try {
      const companyName = data.companyName || 'Document Management System';
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: data.recipientEmail,
        subject: `Document Released to ${data.recipientName}: ${data.documentTitle}`,
        html: this.generateDocumentReleasedEmailHTML(data),
        text: this.generateDocumentReleasedEmailText(data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Document released email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending document released email:', error);
      return false;
    }
  }

  /**
   * Send document completed notification email
   */
  async sendDocumentCompletedEmail(data: DocumentCompletedEmailData): Promise<boolean> {
    try {
      const companyName = data.companyName || 'Document Management System';
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: data.recipientEmail,
        subject: `Document Completed: ${data.documentTitle}`,
        html: this.generateDocumentCompletedEmailHTML(data),
        text: this.generateDocumentCompletedEmailText(data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Document completed email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending document completed email:', error);
      return false;
    }
  }

  /**
   * Generate HTML email template for document shared notification
   */
  private generateDocumentSharedEmailHTML(data: DocumentSharedEmailData): string {
    const companyName = data.companyName || 'Document Management System';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Document Shared with You: ${data.documentTitle}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f6f9fc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f6f9fc;
          }
          .email-content { 
            background-color: #ffffff; 
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .header { 
            background: linear-gradient(135deg, #007bff, #0056b3); 
            padding: 30px; 
            text-align: center; 
            color: white;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .main-content { 
            padding: 40px 30px; 
          }
          .welcome-message {
            text-align: center;
            margin-bottom: 30px;
          }
          .welcome-message h1 {
            color: #007bff;
            margin-top: 0;
          }
          .content-text {
            margin-bottom: 25px;
          }
          .content-text p {
            margin: 0 0 15px 0;
            font-size: 16px;
            line-height: 1.6;
          }
          .document-info {
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #007bff;
          }
          .document-info h3 {
            margin-top: 0;
            color: #495057;
          }
          .detail-item {
            display: flex;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-item:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: bold;
            color: #495057;
            width: 120px;
            flex-shrink: 0;
          }
          .detail-value {
            flex-grow: 1;
            color: #6c757d;
          }
          .action-button { 
            display: block; 
            width: 220px;
            padding: 16px; 
            background: linear-gradient(135deg, #007bff, #0056b3); 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 25px auto;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(0, 123, 255, 0.2);
          }
          .action-button:hover {
            background: linear-gradient(135deg, #0056b3, #004085); 
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0, 123, 255, 0.3);
          }
          .link-container {
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            word-break: break-all; 
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .security-note { 
            background: #fff5f5; 
            border-left: 4px solid #e74c3c; 
            padding: 15px; 
            border-radius: 0 8px 8px 0; 
            margin: 25px 0;
          }
          .security-note h3 {
            color: #e74c3c;
            margin-top: 0;
          }
          .footer { 
            background-color: #f8f9fa; 
            padding: 25px 30px; 
            text-align: center; 
            font-size: 14px; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef;
          }
          .footer-links {
            margin: 15px 0;
          }
          .footer-links a {
            color: #007bff;
            text-decoration: none;
            margin: 0 10px;
          }
          .footer-links a:hover {
            text-decoration: underline;
          }
          .divider {
            height: 1px;
            background-color: #e9ecef;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-content">
            <div class="header">
              <div class="logo">${companyName}</div>
              <h1>Document Shared</h1>
            </div>
            <div class="main-content">
              <div class="welcome-message">
                <h1>New Document Shared with You</h1>
              </div>
              
              <div class="content-text">
                <p>Hello ${data.recipientName},</p>
                
                <p>${data.sharedBy} has shared a document with you:</p>
                <p><strong>${data.documentTitle}</strong></p>
                
                ${data.message ? `<p>Message: ${data.message}</p>` : ''}
                
                <p>You can now access this document in the system.</p>
              </div>
              
              <div class="document-info">
                <h3>Document Details</h3>
                <div class="detail-item">
                  <span class="detail-label">Document:</span>
                  <span class="detail-value">${data.documentTitle}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Shared By:</span>
                  <span class="detail-value">${data.sharedBy}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${new Date().toLocaleString()}</span>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${data.documentUrl}" class="action-button">View Document</a>
              </div>
              
              <div class="content-text">
                <p>Alternatively, you can copy and paste this link into your browser:</p>
                <div class="link-container">${data.documentUrl}</div>
              </div>

              <div class="security-note">
                <h3>Important</h3>
                <p>If you were not expecting this document, please contact your administrator.</p>
              </div>
            </div>
            <div class="footer">
              <div class="footer-links">
                <a href="#" style="color: #007bff;">Privacy Policy</a> |
                <a href="#" style="color: #007bff;">Terms of Service</a> |
                <a href="#" style="color: #007bff;">Contact Support</a>
              </div>
              <div class="divider"></div>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email for document shared notification
   */
  private generateDocumentSharedEmailText(data: DocumentSharedEmailData): string {
    const companyName = data.companyName || 'Document Management System';
    return `
NEW DOCUMENT SHARED WITH YOU: ${data.documentTitle}

Hello ${data.recipientName},

${data.sharedBy} has shared a document with you: ${data.documentTitle}

Document: ${data.documentTitle}
Shared By: ${data.sharedBy}
Date: ${new Date().toLocaleString()}

${data.message ? `Message: ${data.message}` : ''}

You can view the document at: ${data.documentUrl}

IMPORTANT:
If you were not expecting this document, please contact your administrator.

This is an automated message. Please do not reply to this email.

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
    `.trim();
  }

  /**
   * Generate HTML email template for document released notification
   */
  private generateDocumentReleasedEmailHTML(data: DocumentReleasedEmailData): string {
    const companyName = data.companyName || 'Document Management System';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document Released to You: ${data.documentTitle}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f6f9fc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f6f9fc;
          }
          .email-content { 
            background-color: #ffffff; 
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .header { 
            background: linear-gradient(135deg, #007bff, #0056b3); 
            padding: 30px; 
            text-align: center; 
            color: white;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .main-content { 
            padding: 40px 30px; 
          }
          .welcome-message {
            text-align: center;
            margin-bottom: 30px;
          }
          .welcome-message h1 {
            color: #007bff;
            margin-top: 0;
          }
          .content-text {
            margin-bottom: 25px;
          }
          .content-text p {
            margin: 0 0 15px 0;
            font-size: 16px;
            line-height: 1.6;
          }
          .document-info {
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #007bff;
          }
          .document-info h3 {
            margin-top: 0;
            color: #495057;
          }
          .detail-item {
            display: flex;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-item:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: bold;
            color: #495057;
            width: 150px;
            flex-shrink: 0;
          }
          .detail-value {
            flex-grow: 1;
            color: #6c757d;
          }
          .action-button { 
            display: block; 
            width: 220px;
            padding: 16px; 
            background: linear-gradient(135deg, #007bff, #0056b3); 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 25px auto;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(0, 123, 255, 0.2);
          }
          .action-button:hover {
            background: linear-gradient(135deg, #0056b3, #004085); 
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0, 123, 255, 0.3);
          }
          .link-container {
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            word-break: break-all; 
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .footer { 
            background-color: #f8f9fa; 
            padding: 25px 30px; 
            text-align: center; 
            font-size: 14px; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef;
          }
          .footer-links {
            margin: 15px 0;
          }
          .footer-links a {
            color: #007bff;
            text-decoration: none;
            margin: 0 10px;
          }
          .footer-links a:hover {
            text-decoration: underline;
          }
          .divider {
            height: 1px;
            background-color: #e9ecef;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-content">
            <div class="header">
              <div class="logo">${companyName}</div>
              <h1>Document Released</h1>
            </div>
            <div class="main-content">
              <div class="welcome-message">
                <h1>Document Released to You</h1>
              </div>
              
              <div class="content-text">
                <p>Hello ${data.recipientName},</p>
                
                <p>A document has been released to you from ${data.fromDepartment}:</p>
                <p><strong>${data.documentTitle}</strong></p>
                
                ${data.message ? `<p>Message: ${data.message}</p>` : ''}
                
                <p>You are now responsible for this document.</p>
              </div>
              
              <div class="document-info">
                <h3>Document Details</h3>
                <div class="detail-item">
                  <span class="detail-label">Document:</span>
                  <span class="detail-value">${data.documentTitle}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Released By:</span>
                  <span class="detail-value">${data.releasedBy}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">From Department:</span>
                  <span class="detail-value">${data.fromDepartment}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${new Date().toLocaleString()}</span>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${data.documentUrl}" class="action-button">View Document</a>
              </div>
              
              <div class="content-text">
                <p>Alternatively, you can copy and paste this link into your browser:</p>
                <div class="link-container">${data.documentUrl}</div>
              </div>
              
              <div class="content-text">
                <p>Take appropriate action on this document as per your workflow requirements.</p>
              </div>
            </div>
            <div class="footer">
              <div class="footer-links">
                <a href="#" style="color: #007bff;">Privacy Policy</a> |
                <a href="#" style="color: #007bff;">Terms of Service</a> |
                <a href="#" style="color: #007bff;">Contact Support</a>
              </div>
              <div class="divider"></div>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email for document released notification
   */
  private generateDocumentReleasedEmailText(data: DocumentReleasedEmailData): string {
    const companyName = data.companyName || 'Document Management System';
    return `
DOCUMENT RELEASED TO YOU: ${data.documentTitle}

Hello ${data.recipientName},

A document has been released to you from ${data.fromDepartment}: ${data.documentTitle}

Document: ${data.documentTitle}
Released By: ${data.releasedBy}
From Department: ${data.fromDepartment}
Date: ${new Date().toLocaleString()}

${data.message ? `Message: ${data.message}` : ''}

You are now responsible for this document.

View the document at: ${data.documentUrl}

Take appropriate action on this document as per your workflow requirements.

This is an automated message. Please do not reply to this email.

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
    `.trim();
  }

  /**
   * Generate HTML email template for document completed notification
   */
  private generateDocumentCompletedEmailHTML(data: DocumentCompletedEmailData): string {
    const companyName = data.companyName || 'Document Management System';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document Completed: ${data.documentTitle}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f6f9fc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f6f9fc;
          }
          .email-content { 
            background-color: #ffffff; 
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .header { 
            background: linear-gradient(135deg, #ffc107, #e0a800); 
            padding: 30px; 
            text-align: center; 
            color: #212529;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .main-content { 
            padding: 40px 30px; 
          }
          .welcome-message {
            text-align: center;
            margin-bottom: 30px;
          }
          .welcome-message h1 {
            color: #ffc107;
            margin-top: 0;
          }
          .content-text {
            margin-bottom: 25px;
          }
          .content-text p {
            margin: 0 0 15px 0;
            font-size: 16px;
            line-height: 1.6;
          }
          .document-info {
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #ffc107;
          }
          .document-info h3 {
            margin-top: 0;
            color: #495057;
          }
          .detail-item {
            display: flex;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-item:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: bold;
            color: #495057;
            width: 120px;
            flex-shrink: 0;
          }
          .detail-value {
            flex-grow: 1;
            color: #6c757d;
          }
          .action-button { 
            display: block; 
            width: 220px;
            padding: 16px; 
            background: linear-gradient(135deg, #ffc107, #e0a800); 
            color: #212529 !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 25px auto;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(255, 193, 7, 0.2);
          }
          .action-button:hover {
            background: linear-gradient(135deg, #e0a800, #d39e00); 
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(255, 193, 7, 0.3);
          }
          .link-container {
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            word-break: break-all; 
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            background-color: #d4edda;
            color: #155724;
            font-weight: bold;
            margin: 10px 0;
          }
          .footer { 
            background-color: #f8f9fa; 
            padding: 25px 30px; 
            text-align: center; 
            font-size: 14px; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef;
          }
          .footer-links {
            margin: 15px 0;
          }
          .footer-links a {
            color: #007bff;
            text-decoration: none;
            margin: 0 10px;
          }
          .footer-links a:hover {
            text-decoration: underline;
          }
          .divider {
            height: 1px;
            background-color: #e9ecef;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-content">
            <div class="header">
              <div class="logo">${companyName}</div>
              <h1>Document Completed</h1>
            </div>
            <div class="main-content">
              <div class="welcome-message">
                <h1>Document Workflow Completed</h1>
              </div>
              
              <div class="content-text">
                <p>Hello ${data.recipientName},</p>
                
                <p>A document has been marked as completed:</p>
                <p><strong>${data.documentTitle}</strong></p>
                
                <div class="status-badge">COMPLETED</div>
                
                ${data.message ? `<p>Message: ${data.message}</p>` : ''}
              </div>
              
              <div class="document-info">
                <h3>Document Details</h3>
                <div class="detail-item">
                  <span class="detail-label">Document:</span>
                  <span class="detail-value">${data.documentTitle}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Completed By:</span>
                  <span class="detail-value">${data.completedBy}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${new Date().toLocaleString()}</span>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${data.documentUrl}" class="action-button">View Document</a>
              </div>
              
              <div class="content-text">
                <p>Alternatively, you can copy and paste this link into your browser:</p>
                <div class="link-container">${data.documentUrl}</div>
              </div>
              
              <div class="content-text">
                <p>The workflow for this document has been completed successfully.</p>
              </div>
            </div>
            <div class="footer">
              <div class="footer-links">
                <a href="#" style="color: #007bff;">Privacy Policy</a> |
                <a href="#" style="color: #007bff;">Terms of Service</a> |
                <a href="#" style="color: #007bff;">Contact Support</a>
              </div>
              <div class="divider"></div>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email for document completed notification
   */
  private generateDocumentCompletedEmailText(data: DocumentCompletedEmailData): string {
    const companyName = data.companyName || 'Document Management System';
    return `
DOCUMENT COMPLETED: ${data.documentTitle}

Hello ${data.recipientName},

A document has been marked as completed: ${data.documentTitle}

Document: ${data.documentTitle}
Completed By: ${data.completedBy}
Date: ${new Date().toLocaleString()}

STATUS: COMPLETED

${data.message ? `Message: ${data.message}` : ''}

View the document at: ${data.documentUrl}

The workflow for this document has been completed successfully.

This is an automated message. Please do not reply to this email.

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
    `.trim();
  }
}
