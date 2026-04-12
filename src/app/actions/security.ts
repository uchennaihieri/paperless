"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import crypto from "crypto";

// Ensure a 32-byte key is used for AES-256
const SECRET = process.env.NEXTAUTH_SECRET || "default_local_secret_key_needs_32B";
const IV_LENGTH = 16; 

function getKey() {
  return crypto.createHash("sha256").update(String(SECRET)).digest("base64").substring(0, 32);
}

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(getKey()), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string) {
  if (!text) return "";
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(getKey()), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function saveSecuritySignature(token: string, signatureBlob: string) {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  if (!userId) return { success: false, error: "Not logged in" };

  if (token.length !== 8) {
    return { success: false, error: "Token must be exactly 8 characters long." };
  }

  const hashedToken = hashToken(token);
  const encryptedSignature = encrypt(signatureBlob);

  try {
    // Also save the generic non-encrypted signature to User for backward compat
    await prisma.user.update({
      where: { id: userId },
      data: { signature: signatureBlob }
    });

    await prisma.securityData.upsert({
      where: { userId },
      update: { hashedToken, encryptedSignature },
      create: { userId, hashedToken, encryptedSignature },
    });
    return { success: true };
  } catch (err: any) {
    console.error("Save security failed:", err);
    return { success: false, error: "Failed to save security token and signature." };
  }
}

export async function verifySignatureToken(token: string) {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  if (!userId) return { success: false, error: "Not logged in" };

  const hashedInput = hashToken(token);
  const data = await prisma.securityData.findUnique({ where: { userId } });
  
  if (!data) return { success: false, error: "No security signature token found for your account." };
  
  if (data.hashedToken !== hashedInput) {
    return { success: false, error: "Invalid signature token." };
  }

  try {
    const rawSignature = decrypt(data.encryptedSignature);
    return { success: true, signatureData: rawSignature };
  } catch(e) {
    return { success: false, error: "System could not properly verify/decrypt signature." };
  }
}

export async function getMySignature() {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  if (!userId) return { success: false, error: "Not logged in" };

  try {
    const data = await prisma.securityData.findUnique({ where: { userId } });
    if (!data) return { success: false, error: "No signature configured yet." };

    const rawSignature = decrypt(data.encryptedSignature);
    return { success: true, signatureData: rawSignature };
  } catch (error) {
    return { success: false, error: "Failed to retrieve signature." };
  }
}
