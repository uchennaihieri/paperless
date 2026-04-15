import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Finds or creates a "New Deposit Account" form template
async function getOrCreateTemplate() {
  let template = await prisma.formTemplate.findFirst({
    where: { name: 'New Deposit Account' }
  });
  if (!template) {
    template = await prisma.formTemplate.create({
      data: {
        name: 'New Deposit Account',
        description: 'Customer deposit account opening form submitted via mobile app.',
        fields: [],
        formOwner: 'Mobile',
        formTreater: 'Operations',
      }
    });
  }
  return template;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { formResponses, submittedById, submissionId } = body;

    const template = await getOrCreateTemplate();

    const year = new Date().getFullYear();
    const count = await prisma.formSubmission.count({ 
      where: { formName: 'New Deposit Account', NOT: { status: 'Draft' } } 
    });
    const reference = `DA-${year}-${String(count + 1).padStart(5, '0')}`;

    let submission;
    if (submissionId) {
      submission = await prisma.formSubmission.update({
        where: { id: submissionId },
        data: {
          reference,
          status: 'Submitted',
          formResponses,
          submittedById: submittedById ?? null,
        }
      });
    } else {
      submission = await prisma.formSubmission.create({
        data: {
          formName: 'New Deposit Account',
          reference,
          status: 'Submitted',
          formResponses,
          signingType: 'sequential',
          templateId: template.id,
          submittedById: submittedById ?? null,
        }
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (error: any) {
    console.error('[mobile/submissions/deposit]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
