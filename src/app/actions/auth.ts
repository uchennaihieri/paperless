"use server";

import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Create transporter once at module level (singleton) - same pattern as working config
const verificationsTransporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  secure: true,
  port: 465,
  auth: {
    user: "verifications@monapp.ng",
    pass: "5Aqbu$kb",
  },
});

export async function sendOTP(email: string) {
  try {
    // 1. Check if user exists on the users table and is active
    const users = await prisma.user.findMany({
      where: {
        finca_email: { equals: email, mode: 'insensitive' },
        status: { equals: 'active', mode: 'insensitive' }
      }
    });

    if (users.length === 0) {
      return { success: false, error: "No active user found with this email." };
    }

    // 2. Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // 3. Store OTP in DB with expiration of 10 mins
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    // Delete any existing OTPs for this email first
    await prisma.verificationToken.deleteMany({
      where: { email }
    });

    await prisma.verificationToken.create({
      data: { email, token: otp, expires }
    });

    // 4. Send OTP email
    await verificationsTransporter.sendMail({
      from: "Paperless <verifications@monapp.ng>",
      to: email,
      subject: "Paperless – Your Login OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #B50938; margin-bottom: 4px;">Paperless by FINCA</h2>
          <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Operations Platform</p>
          <hr style="border-color: #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 15px; color: #111827;">Your one-time login code is:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 16px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #B50938;">${otp}</span>
          </div>
          <p style="font-size: 13px; color: #6b7280;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending OTP:", error);
    return { success: false, error: "Failed to send OTP. Please try again." };
  }
}
