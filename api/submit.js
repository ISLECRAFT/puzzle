
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const form = new formidable.IncomingForm({ multiples: true });
  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      const { customerName, contactNumber, emailAddress, deliveryAddress,
              engravedMessage, cardMessage, product, mvrAmount, usdAmount } = fields;

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const uploadedLinks = [];

      const uploadFile = async (file, label) => {
        const meta = {
          name: file.originalFilename,
          parents: [folderId],
        };
        const media = {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.filepath),
        };
        const uploaded = await drive.files.create({ resource: meta, media, fields: 'id' });
        const fileId = uploaded.data.id;
        await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });
        const link = `https://drive.google.com/file/d/${fileId}/view`;
        uploadedLinks.push(`${label}: ${link}`);
      };

      if (files.uploadedFile) await uploadFile(files.uploadedFile, "Photo");
      if (files.paymentSlip) await uploadFile(files.paymentSlip, "Payment Slip");

      const mailBody = `
New puzzle order received:

Name: ${customerName}
Contact: ${contactNumber}
Email: ${emailAddress}
Address: ${deliveryAddress}
Product: ${product}
Engraved Message: ${engravedMessage}
Card Message: ${cardMessage}
Amount: MVR ${mvrAmount} / USD ${usdAmount}

File Links:
${uploadedLinks.join("\n")}
      `.trim();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: 'New Puzzle Order - EreYvi',
        text: mailBody,
      });

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error("Error processing submission:", e);
      return res.status(500).send('Submission failed.');
    }
  });
}
