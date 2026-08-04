const path = require("path");
const QRCode = require("qrcode");

const UPI_ID = "ZILASAINIK21313200@iob";
const PAYEE_NAME = "West Bengal Sainik Board";

const upiLink =
    `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&cu=INR`;

const outputPath = path.join(__dirname, "..", "public", "qr-payment.png");

QRCode.toFile(outputPath, upiLink, {
    type: "png",
    width: 400,
    margin: 2
})
    .then(() => {
        console.log("QR generated:", outputPath);
        console.log("Encoded link:", upiLink);
    })
    .catch((err) => {
        console.error("Failed to generate QR:", err);
        process.exit(1);
    });
