import nodemailer from "nodemailer";

export const sendOtpEmail = async (email: string, otp: string): Promise<boolean> => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "no-reply@aletheia.com";

  const subject = "Aletheia - Password Reset OTP";
  const text = `Hello,

You have requested to reset your password. Your 6-digit OTP code is: ${otp}.

This OTP is valid for 5 minutes. If you did not request this, please ignore this email.

Best regards,
Aletheia Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">Aletheia Password Reset</h2>
      <p>Hello,</p>
      <p>You have requested to reset your password. Please use the following 6-digit OTP code to complete the request:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; color: #1f2937;">
        ${otp}
      </div>
      <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
      <br />
      <p>Best regards,<br />Aletheia Team</p>
    </div>
  `;

  // Always log to console for development convenience
  console.log("\n==================================================");
  console.log(`📧 EMAIL SENT TO: ${email}`);
  console.log(`🔑 PASSWORD RESET OTP: ${otp}`);
  console.log("==================================================\n");

  if (!host || !user || !pass) {
    console.log("ℹ️ SMTP settings are incomplete. Sent OTP to console log only.");
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : 587,
      secure: port === "465",
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });

    console.log(`✅ Email sent successfully to ${email} via SMTP.`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send email via SMTP:", error);
    return false;
  }
};

export const sendSignupOtpEmail = async (email: string, otp: string): Promise<boolean> => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "no-reply@aletheia.com";

  const subject = "Aletheia - Signup Verification OTP";
  const text = `Hello,

Your 6-digit OTP code to verify your signup is: ${otp}.

This OTP is valid for 5 minutes. If you did not request this, please ignore this email.

Best regards,
Aletheia Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">Aletheia Signup Verification</h2>
      <p>Hello,</p>
      <p>Please use the following 6-digit OTP code to verify your signup:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; color: #1f2937;">
        ${otp}
      </div>
      <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
      <br />
      <p>Best regards,<br />Aletheia Team</p>
    </div>
  `;

  // Always log to console for development convenience
  console.log("\n==================================================");
  console.log(`📧 EMAIL SENT TO: ${email}`);
  console.log(`🔑 SIGNUP VERIFICATION OTP: ${otp}`);
  console.log("==================================================\n");

  if (!host || !user || !pass) {
    console.log("ℹ️ SMTP settings are incomplete. Sent OTP to console log only.");
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : 587,
      secure: port === "465",
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });

    console.log(`✅ Email sent successfully to ${email} via SMTP.`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send email via SMTP:", error);
    return false;
  }
};
