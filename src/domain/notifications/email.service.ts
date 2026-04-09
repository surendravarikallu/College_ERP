import nodemailer from 'nodemailer';

/**
 * Email service using SMTP (Gmail App Password).
 * Configure via env vars: SMTP_USER, SMTP_PASS
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '', // Google App Password
  },
});

export class EmailService {
  static async send(to: string, subject: string, html: string) {
    if (!process.env.SMTP_USER) {
      console.warn('[Email] SMTP not configured. Skipping email to:', to);
      return { sent: false, reason: 'SMTP not configured' };
    }

    try {
      await transporter.sendMail({
        from: `"College ERP" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`[Email] Sent to ${to}: ${subject}`);
      return { sent: true };
    } catch (err: any) {
      console.error('[Email Error]', err.message);
      return { sent: false, reason: err.message };
    }
  }

  static async sendFeeReminder(to: string, studentName: string, amount: number, dueDate: string) {
    return this.send(to, 'Fee Payment Reminder', `
      <h2>Fee Payment Reminder</h2>
      <p>Dear ${studentName},</p>
      <p>This is a reminder that you have an outstanding fee of <strong>₹${amount.toLocaleString()}</strong> due on <strong>${dueDate}</strong>.</p>
      <p>Please login to the ERP portal to make your payment.</p>
      <p>Regards,<br/>College ERP System</p>
    `);
  }

  static async sendAttendanceWarning(to: string, studentName: string, percentage: number) {
    return this.send(to, 'Low Attendance Warning', `
      <h2>Attendance Warning</h2>
      <p>Dear ${studentName},</p>
      <p>Your current attendance is <strong>${percentage}%</strong>, which is below the required 75%.</p>
      <p>Please ensure regular attendance to avoid academic penalties.</p>
      <p>Regards,<br/>College ERP System</p>
    `);
  }

  static async sendResultNotification(to: string, studentName: string, examName: string) {
    return this.send(to, 'Exam Results Published', `
      <h2>Results Published</h2>
      <p>Dear ${studentName},</p>
      <p>The results for <strong>${examName}</strong> have been published.</p>
      <p>Please login to the ERP portal to view your results.</p>
      <p>Regards,<br/>College ERP System</p>
    `);
  }
}
