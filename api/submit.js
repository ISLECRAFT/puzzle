const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

export default function handler(req, res) {
  upload.single('photo')(req, {}, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Upload error.' });
    }
    const { name, email, size, instructions } = req.body;
    const photo = req.file;

    console.log('New Puzzle Order:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Size:', size);
    console.log('Instructions:', instructions);
    console.log('Uploaded file:', photo.originalname);

    res.status(200).send(`
      <h2>Thank you! Your order has been received.</h2>
      <p><a href='/'>Go back</a></p>
    `);
  });
}
