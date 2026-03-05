const fs = require('fs');
const https = require('https');
const path = require('path');

const url = "https://i.ibb.co/h1H5BcmT/image.png"; // Direct copy of the uploaded image
const rawImgPath = path.join(__dirname, 'public', 'assets', 'footer', 'shuttle-raw.png');

const file = fs.createWriteStream(rawImgPath);

https.get(url, response => {
    response.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log("Image downloaded to", rawImgPath);
    });
}).on('error', err => {
    fs.unlink(rawImgPath, () => { });
    console.error("Error downloading image:", err.message);
});
