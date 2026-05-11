const { PrismaClient } = require('../paperlessBackend/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:Cordelia456@@localhost:5432/paperless' } } });

async function main() {
  const req = await prisma.contractRequest.findFirst({ orderBy: { createdAt: 'desc' }});
  console.log('Contract:', req);
  if (req) {
    const tpl = await prisma.pdfTemplate.findUnique({ where: { id: req.templateId }});
    console.log('Template:', tpl);
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
