import { NextRequest, NextResponse } from "next/server";
import { getSubmission } from "@/app/actions/form";
import puppeteer from "puppeteer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id) return NextResponse.json({ error: "Missing submission ID" }, { status: 400 });

  const submission = await getSubmission(id);
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    let htmlContent = "";

    if (submission.template?.htmlTemplate) {
      // Use the custom administrator template
      htmlContent = submission.template.htmlTemplate.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
        const key = p1.trim();
        // Check if the key matches a form response
        if (submission.formResponses[key] !== undefined) {
          const val = submission.formResponses[key];
          return Array.isArray(val) ? val.join(", ") : String(val);
        }
        
        // Special variables
        if (key === "FormName") return submission.formName;
        if (key === "SubmissionID") return submission.id.toUpperCase();
        if (key === "DateSubmitted") return new Date(submission.createdAt).toLocaleString();
        
        // If unmapped, leave it as is or blank
        return match;
      });
    } else {
      // Fallback: Generate an HTML string automatically based on the submission
      let tableRows = "";
      Object.entries(submission.formResponses).forEach(([key, val]) => {
        const valStr = Array.isArray(val) ? val.join(", ") : String(val);
        tableRows += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%; vertical-align: top;">${key}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; width: 60%; vertical-align: top;">${valStr}</td>
          </tr>
        `;
      });

      let signatoriesList = "";
      submission.signatories.forEach((sig) => {
        let signatureDisplay = `<div style="font-family: 'Brush Script MT', cursive; font-size: 24px; color: #B50938; opacity: 0.8;">~${sig.userName.split(' ')[0]}</div>`;
        if (sig.signatureData) {
          signatureDisplay = `<img src="${sig.signatureData}" alt="Signature" style="max-height: 50px; max-width: 200px;" />`;
        }

        signatoriesList += `
          <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between;">
              <strong>${sig.userName}</strong>
              <span style="color: #666; font-size: 12px;">${sig.signedAt ? new Date(sig.signedAt).toLocaleDateString() : ""}</span>
            </div>
            <div style="color: grey; font-size: 14px; margin-bottom: 10px;">${sig.email}</div>
            ${signatureDisplay}
          </div>
        `;
      });

      htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${submission.formName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #B50938; padding-bottom: 20px; margin-bottom: 30px; }
            .title { margin: 0; font-size: 24px; text-transform: uppercase; }
            .ref { color: grey; font-size: 12px; }
            .logo { font-weight: bold; color: #B50938; font-size: 28px; }
            .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
            .info-item h4 { margin: 0 0 5px 0; color: grey; font-size: 10px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 40px; }
            thead { background: #333; color: white; }
            th { padding: 10px; text-align: left; }
            .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">FINCA</div>
            <div style="text-align: right;">
              <h1 class="title">${submission.formName}</h1>
              <p class="ref">REF: ${submission.id.toUpperCase()}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <h4>Date Submitted</h4>
              <div>${new Date(submission.createdAt).toLocaleString()}</div>
            </div>
            <div class="info-item">
              <h4>Form Treater</h4>
              <div>${submission.template?.formTreater || "N/A"}</div>
            </div>
          </div>

          <table>
            <thead>
               <tr><th>FORM FIELD</th><th>RESPONSE</th></tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="info-item" style="margin-bottom: 20px;">
            <h4>Digitally Signed By</h4>
          </div>
          <div class="sign-grid">
            ${signatoriesList}
          </div>
        </body>
      </html>
      `;
    }

    // Launch puppeteer using the local system Chrome/Edge installation
    let browser;
    try {
      browser = await puppeteer.launch({ headless: true, channel: 'chrome' });
    } catch (e) {
      // Fallback to Edge if Google Chrome isn't installed
      browser = await puppeteer.launch({ headless: true, channel: 'msedge' });
    }
    
    const page = await browser.newPage();
    
    // Explicitly set the HTML content instead of using a view template route
    await page.setContent(htmlContent, { waitUntil: 'load' });
    
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    
    await browser.close();

    const filename = `${submission.formName.replace(/\s+/g, "_")}-${submission.id.slice(-6)}.pdf`;
    const disposition = action === "print" ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`;

    // Return the generated PDF to the browser for download or print
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
      },
    });

  } catch (error) {
    console.error("PDF Generate Error", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
