import nodemailer from "nodemailer";

function parseBoolean(value) {
  return String(value).toLowerCase() === "true";
}

async function createTransporter() {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: parseBoolean(process.env.EMAIL_SECURE),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendEmail({ to, subject, text, html, attachments }) {
  try {
    const transporter = await createTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@example.com";

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
      attachments,
    });

    console.log("[EMAIL SERVICE] Email sent:", info);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log("[EMAIL SERVICE] Preview URL:", nodemailer.getTestMessageUrl(info));
    }

    return {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info) || null,
    };
  } catch (err) {
    console.error("[EMAIL SERVICE] Error sending email:", err);
    throw err;
  }
}
