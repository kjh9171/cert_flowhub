// FlowHub 이메일 발송 (Nodemailer)

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SMTP_HOST) {
    // SMTP 미설정 시 콘솔로 대체
    console.log(`[email:mock] to=${to} subject=${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER || "flowhub@localhost",
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error("[email] send failed", e);
  }
}
