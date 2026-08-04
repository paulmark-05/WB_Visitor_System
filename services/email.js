/*
================================================================
EMAIL (Gmail API, not SMTP)

Render blocks/times out raw outbound SMTP on this account
(confirmed: ENETUNREACH over IPv6, then ETIMEDOUT over IPv4
after forcing family:4), regardless of host/port/transporter
settings. The Gmail API sends over normal HTTPS instead, so
it isn't affected by SMTP port blocking, and it sends as the
real rsb.wb01@gmail.com mailbox rather than a sandbox address.

Setup (one-time, in Google Cloud Console):
  1. Create/select a project, enable the "Gmail API".
  2. OAuth consent screen: add scope
     https://www.googleapis.com/auth/gmail.send,
     add the sending Gmail account as a test user.
  3. Credentials: create an OAuth Client ID (type "Web application",
     redirect URI https://developers.google.com/oauthplayground).
  4. Use https://developers.google.com/oauthplayground (gear icon ->
     "Use your own OAuth credentials") to authorize the Gmail account
     with the gmail.send scope and obtain a refresh token.

Required env vars:
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REFRESH_TOKEN
  EMAIL_FROM   (the Gmail address the refresh token belongs to,
                e.g. rsb.wb01@gmail.com)
================================================================
*/

const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");

const EMAIL_FROM =
    process.env.EMAIL_FROM || "";

const oauth2Client =
    new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail =
    google.gmail({
        version: "v1",
        auth: oauth2Client
    });

if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REFRESH_TOKEN ||
    !EMAIL_FROM
) {

    console.error(
        "❌ Gmail API env vars missing (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN / EMAIL_FROM) — emails will fail."
    );

} else {

    console.log(
        "✅ Gmail API email client ready"
    );

}

function toBase64Url(buffer) {

    return buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

}

async function sendEmail({ to, subject, html, attachments }) {

    const mail = new MailComposer({

        from: EMAIL_FROM,
        to,
        subject,
        html,
        attachments

    });

    const message =
        await mail.compile().build();

    const raw =
        toBase64Url(message);

    const result =
        await gmail.users.messages.send({

            userId: "me",

            requestBody: { raw }

        });

    return result.data;

}

module.exports = { sendEmail };
