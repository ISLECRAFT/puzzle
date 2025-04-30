
const formidable = require("formidable");
const fs = require("fs");
const { google } = require("googleapis");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).send("Form error");
    }

    try {
      const {
        product,
        engravedMessage,
        cardMessage,
        name,
        phone,
        email,
        address,
        mvrAmount,
        usdAmount,
      } = fields;

      const { photo, slip } = files;

      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });

      const drive = google.drive({ version: "v3", auth });

      const uploadFile = async (file, label) => {
        if (!file) return null;
        const response = await drive.files.create({
          requestBody: {
            name: `${label}_${file.originalFilename}`,
            parents: [process.env.GDRIVE_FOLDER_ID],
          },
          media: {
            mimeType: file.mimetype,
            body: fs.createReadStream(file.filepath),
          },
        });
        return `https://drive.google.com/file/d/${response.data.id}`;
      };

      const photoLink = await uploadFile(photo, "photo");
      const slipLink = await uploadFile(slip, "slip");

      const orderData = {
        OrderID: "debug",
        Name: name,
        Email: email,
        Phone: phone,
        Address: address,
        Product: product,
        Engraving: engravedMessage,
        CardMessage: cardMessage,
        MVR: mvrAmount,
        USD: usdAmount,
        PhotoLink: photoLink,
        SlipLink: slipLink,
        Time: new Date().toISOString(),
      };

      console.log("Order received:", orderData);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Submit error:", error.message, error.stack);
      return res.status(500).send("Server error");
    }
  });
};
