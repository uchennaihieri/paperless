import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const userIdInt = parseInt(userId);

    // Get all submissions for this user
    const submissions = await prisma.formSubmission.findMany({
      where: { submittedById: userIdInt },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        reference: true,
        formName: true,
        status: true,
        updatedAt: true,
        formResponses: true,
      }
    });

    const stats = {
      pending: submissions.filter(s => s.status === 'Draft').length,
      inReview: submissions.filter(s => s.status === 'Submitted' || s.status === 'In-review' || s.status === 'Awaiting Final Approval').length,
      completed: submissions.filter(s => s.status === 'Completed').length,
      errors: submissions.filter(s => s.status === 'Rejected').length,
    };

    return NextResponse.json({ 
      success: true, 
      stats, 
      submissions 
    });
  } catch (error: any) {
    console.error('[mobile/dashboard]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
