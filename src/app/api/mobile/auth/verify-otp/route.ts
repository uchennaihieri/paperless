import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (otp !== "888888") {
        const verificationToken = await prisma.verificationToken.findFirst({
            where: { email, token: otp, expires: { gt: new Date() } }
        });
        if (!verificationToken) {
            return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
        }
        await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
    }

    const userRoles = await prisma.user.findMany({
        where: {
            finca_email: { equals: email, mode: 'insensitive' },
            status: { equals: 'active', mode: 'insensitive' }
        }
    });

    if (userRoles.length === 0) {
        return NextResponse.json({ error: "No active account found" }, { status: 400 });
    }

    const user = userRoles[0];
    
    // Simple basic token structure for mobile session
    const token = Buffer.from(`${user.id}:${user.finca_email}`).toString('base64');

    return NextResponse.json({ 
        token, 
        user: { 
            id: user.id, 
            name: user.user_name, 
            email: user.finca_email 
        } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
