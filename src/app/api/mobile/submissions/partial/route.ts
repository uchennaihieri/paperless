import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { submissionId, formName, formResponses, submittedById } = await req.json();

    if (!formName) {
      return NextResponse.json({ error: 'Form name is required' }, { status: 400 });
    }

    // Ensure template exists
    let template = await prisma.formTemplate.findUnique({ where: { name: formName } });
    if (!template) {
      template = await prisma.formTemplate.create({
        data: {
          name: formName,
          fields: [], // Minimal template for mobile-only forms
          description: 'Auto-generated for mobile submission',
        },
      });
    }

    let submission;
    if (submissionId) {
      // Update existing draft
      submission = await prisma.formSubmission.update({
        where: { id: submissionId },
        data: {
          formResponses: formResponses,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new draft
      const count = await prisma.formSubmission.count();
      const reference = `DA-DRAFT-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;
      
      submission = await prisma.formSubmission.create({
        data: {
          reference,
          formName,
          status: 'Draft',
          formResponses,
          submittedById: submittedById ? parseInt(submittedById) : null,
          templateId: template.id,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      submissionId: submission.id,
      reference: submission.reference 
    });
  } catch (error: any) {
    console.error('Partial submission error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
