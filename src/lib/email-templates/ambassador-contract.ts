/**
 * Email template: Ambassador Contract Signing
 * Used when sending DocuSeal signing link to a new EDEN ambassador.
 */

export function ambassadorContractEmail(
  signingUrl: string,
  clientName: string,
): { subject: string; html: string } {
  const subject = "הסכם התקשרות לשגרירים — ממתין לחתימתך";

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #111;
      direction: rtl;
      text-align: right;
    }
    .wrapper {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .header {
      background: #111111;
      padding: 32px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .header p {
      color: #aaaaaa;
      font-size: 13px;
      margin-top: 6px;
    }
    .body {
      padding: 40px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #111;
    }
    .body p {
      font-size: 15px;
      line-height: 1.7;
      color: #444;
      margin-bottom: 14px;
    }
    .cta-wrapper {
      text-align: center;
      margin: 36px 0;
    }
    .cta-button {
      display: inline-block;
      background: #111111;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 16px;
      font-weight: 700;
      padding: 16px 40px;
      border-radius: 6px;
      letter-spacing: 0.02em;
    }
    .cta-button:hover {
      background: #333333;
    }
    .note {
      font-size: 13px;
      color: #888;
      text-align: center;
      margin-top: -20px;
      margin-bottom: 24px;
    }
    .divider {
      border: none;
      border-top: 1px solid #eeeeee;
      margin: 32px 0;
    }
    .footer {
      padding: 0 40px 32px;
      text-align: center;
    }
    .footer p {
      font-size: 12px;
      color: #999;
      line-height: 1.6;
    }
    .footer .brand {
      font-weight: 700;
      color: #555;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>EDEN™</h1>
      <p>תוכנית שגרירים של EDEN</p>
    </div>

    <div class="body">
      <p class="greeting">שלום ${clientName},</p>

      <p>
        אנחנו שמחים שאתה מצטרף לתוכנית שגרירים של EDEN™.
        הצעד הבא הוא חתימה על הסכם השירות — מסמך שמגדיר את המסגרת, ההתחייבויות, והערבות שלנו לתהליך.
      </p>

      <p>
        לחץ על הכפתור למטה לקריאה ולחתימה על החוזה. הכל מקוון, פשוט, ולוקח פחות מדקה.
      </p>

      <div class="cta-wrapper">
        <a href="${signingUrl}" class="cta-button">חתום על החוזה ←</a>
      </div>
      <p class="note">הקישור אישי לך בלבד. אל תשתף אותו.</p>

      <hr class="divider" />

      <p>
        אחרי החתימה, נצור איתך קשר לתאם את פגישת אינטייק ואסטרטגיה — שם נתחיל לבנות יחד.
      </p>

      <p>
        לשאלות — צור קשר ב-WhatsApp או בדוא"ל ben.evyatar.one@gmail.com.
      </p>
    </div>

    <div class="footer">
      <p class="brand">EDEN™</p>
      <p>בן לוי ואביתר טוויטו</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
