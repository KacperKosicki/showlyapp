const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { name, email, company, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                message: "Uzupełnij wszystkie wymagane pola.",
            });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.CONTACT_EMAIL,
                pass: process.env.CONTACT_EMAIL_APP_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: `"Showly - formularz kontaktowy" <${process.env.CONTACT_EMAIL}>`,
            to: "kontakt@showly.me",
            replyTo: email,
            subject: `[Showly] ${subject}`,
            html: `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
</head>

<body style="
  margin:0;
  padding:40px 20px;
  background:#f5f3ff;
  font-family:Arial,sans-serif;
">

  <div style="
    max-width:700px;
    margin:0 auto;
    background:#ffffff;
    border-radius:28px;
    overflow:hidden;
    box-shadow:0 20px 60px rgba(0,0,0,0.08);
    border:1px solid #ece7ff;
  ">

    <div style="
      background:linear-gradient(135deg,#7c3aed,#ec4899);
      padding:36px;
      color:white;
    ">
      <div style="
        display:flex;
        align-items:center;
        gap:14px;
      ">
        <div style="
          width:52px;
          height:52px;
          border-radius:16px;
          background:rgba(255,255,255,0.15);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:24px;
          font-weight:bold;
        ">
          S
        </div>

        <div>
          <h1 style="
            margin:0;
            font-size:28px;
            font-weight:700;
          ">
            Nowa wiadomość
          </h1>

          <p style="
            margin:6px 0 0 0;
            opacity:.9;
            font-size:15px;
          ">
            Formularz kontaktowy Showly
          </p>
        </div>
      </div>
    </div>

    <div style="padding:36px;">

      <div style="
        background:#faf7ff;
        border:1px solid #eee7ff;
        border-radius:22px;
        padding:24px;
        margin-bottom:28px;
      ">

        <div style="margin-bottom:18px;">
          <span style="
            display:block;
            font-size:13px;
            color:#8b5cf6;
            margin-bottom:6px;
            font-weight:600;
          ">
            Imię i nazwisko
          </span>

          <strong style="
            font-size:17px;
            color:#111827;
          ">
            ${name}
          </strong>
        </div>

        <div style="margin-bottom:18px;">
          <span style="
            display:block;
            font-size:13px;
            color:#8b5cf6;
            margin-bottom:6px;
            font-weight:600;
          ">
            Adres e-mail
          </span>

          <a href="mailto:${email}" style="
            color:#7c3aed;
            text-decoration:none;
            font-weight:600;
          ">
            ${email}
          </a>
        </div>

        <div style="margin-bottom:18px;">
          <span style="
            display:block;
            font-size:13px;
            color:#8b5cf6;
            margin-bottom:6px;
            font-weight:600;
          ">
            Firma / marka
          </span>

          <span style="color:#111827;">
            ${company || "Brak"}
          </span>
        </div>

        <div>
          <span style="
            display:block;
            font-size:13px;
            color:#8b5cf6;
            margin-bottom:6px;
            font-weight:600;
          ">
            Temat
          </span>

          <strong style="color:#111827;">
            ${subject}
          </strong>
        </div>
      </div>

      <div>
        <h2 style="
          margin:0 0 18px 0;
          font-size:20px;
          color:#111827;
        ">
          Treść wiadomości
        </h2>

        <div style="
          background:#ffffff;
          border:1px solid #ebe7ff;
          border-radius:20px;
          padding:24px;
          color:#374151;
          line-height:1.7;
          font-size:15px;
        ">
          ${message.replace(/\n/g, "<br />")}
        </div>
      </div>

      <div style="
        margin-top:32px;
        text-align:center;
      ">
        <a href="mailto:${email}" style="
          display:inline-block;
          background:linear-gradient(135deg,#7c3aed,#ec4899);
          color:white;
          text-decoration:none;
          padding:16px 28px;
          border-radius:16px;
          font-weight:700;
          font-size:15px;
        ">
          Odpowiedz użytkownikowi
        </a>
      </div>

    </div>

    <div style="
      padding:22px;
      border-top:1px solid #f1f1f1;
      text-align:center;
      color:#9ca3af;
      font-size:13px;
    ">
      © Showly.me — Formularz kontaktowy
    </div>

  </div>

</body>
</html>
`,
        });

        return res.status(200).json({
            message: "Wiadomość została wysłana.",
        });
    } catch (error) {
        console.error("Contact form error:", error);

        return res.status(500).json({
            message: "Nie udało się wysłać wiadomości.",
        });
    }
});

module.exports = router;