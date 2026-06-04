/**
 * contract-pdf.tsx
 * Dynamic Hebrew RTL contract PDF generator using @react-pdf/renderer
 * Replicates the full "הסכם שירות — תוכנית שגרירים ™EDEN" structure
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "path";
import { SIGNATURE_FIELD, SIGNATURE_DATE_FIELD } from "./contract-signature-layout";

// ── Font Registration ────────────────────────────────────────────────────────

const FONT_PATH = path.join(process.cwd(), "src/lib/fonts/Heebo-Regular.ttf");

Font.register({
  family: "Heebo",
  src: FONT_PATH,
});

// Hyphenation callback — disable for Hebrew
Font.registerHyphenationCallback((word) => [word]);

// ── Types ────────────────────────────────────────────────────────────────────

export interface MilestoneSession {
  number: number;
  name: string;
  timing: string;
  responsible: string;
  duration: string;
}

export interface ContractData {
  clientName: string;
  clientIdNumber: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  startDate: string;
  price: string;              // e.g. "₪22,000"
  paymentTerms: string;       // e.g. "4 תשלומים × ₪5,500"
  paymentPlan: string;        // e.g. "מסלול A"
  sessions?: MilestoneSession[];
  specialNotes?: string;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Heebo",
    fontSize: 10,
    direction: "rtl",
    padding: 40,
    paddingBottom: 60,
    backgroundColor: "#FFFFFF",
    color: "#1a1a1a",
  },
  // Page number footer
  pageNumber: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#888",
  },
  // Title styles
  mainTitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Heebo",
    color: "#111",
  },
  sectionTitle: {
    fontSize: 12,
    textAlign: "right",
    marginBottom: 6,
    marginTop: 14,
    fontFamily: "Heebo",
    color: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 3,
  },
  subSectionTitle: {
    fontSize: 10.5,
    textAlign: "right",
    marginBottom: 4,
    marginTop: 10,
    fontFamily: "Heebo",
    color: "#222",
    textDecoration: "underline",
  },
  body: {
    textAlign: "right",
    lineHeight: 1.6,
    marginBottom: 4,
    fontFamily: "Heebo",
  },
  bullet: {
    textAlign: "right",
    lineHeight: 1.6,
    marginBottom: 2,
    paddingRight: 8,
    fontFamily: "Heebo",
  },
  // Party info box
  partyBox: {
    border: "1pt solid #ddd",
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    textAlign: "right",
  },
  partyTitle: {
    fontSize: 11,
    textAlign: "right",
    marginBottom: 6,
    color: "#333",
    fontFamily: "Heebo",
  },
  infoRow: {
    flexDirection: "row-reverse",
    marginBottom: 3,
    gap: 4,
    flexWrap: "wrap",
  },
  infoLabel: {
    fontFamily: "Heebo",
    fontSize: 9.5,
    color: "#555",
  },
  infoValue: {
    fontFamily: "Heebo",
    fontSize: 9.5,
    color: "#111",
  },
  // Table styles (milestone sessions)
  table: {
    marginTop: 8,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#2c2c2c",
    padding: 5,
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  tableRowAlt: {
    flexDirection: "row-reverse",
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  tableCell: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Heebo",
    fontSize: 9,
    paddingHorizontal: 3,
  },
  tableHeaderCell: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Heebo",
    fontSize: 9,
    color: "#fff",
    paddingHorizontal: 3,
  },
  tableCellNum: {
    width: 20,
    textAlign: "center",
    fontFamily: "Heebo",
    fontSize: 9,
    paddingHorizontal: 3,
  },
  tableHeaderCellNum: {
    width: 20,
    textAlign: "center",
    fontFamily: "Heebo",
    fontSize: 9,
    color: "#fff",
    paddingHorizontal: 3,
  },
  // Payment table
  paymentRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  // Signature block
  signatureBlock: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  signatureTitle: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 16,
    fontFamily: "Heebo",
  },
  signatureParty: {
    marginBottom: 20,
  },
  signaturePartyTitle: {
    textAlign: "right",
    fontSize: 10.5,
    marginBottom: 10,
    fontFamily: "Heebo",
    color: "#333",
  },
  signatureLine: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 10,
    alignItems: "flex-end",
  },
  signatureLabel: {
    fontFamily: "Heebo",
    fontSize: 9.5,
    color: "#555",
    width: 80,
    textAlign: "right",
  },
  signatureLineDash: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#aaa",
    marginBottom: 2,
  },
  // Notes/highlight box
  noteBox: {
    backgroundColor: "#f5f5f5",
    borderLeftWidth: 3,
    borderLeftColor: "#888",
    padding: 8,
    marginVertical: 6,
    textAlign: "right",
  },
  importantBox: {
    backgroundColor: "#fff3cd",
    border: "1pt solid #ffc107",
    borderRadius: 3,
    padding: 8,
    marginVertical: 6,
    textAlign: "right",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginVertical: 8,
  },
  spacer: {
    marginVertical: 4,
  },
  checkboxRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  checkbox: {
    width: 10,
    height: 10,
    border: "1pt solid #555",
    marginLeft: 4,
  },
});

// ── Default sessions (from PDF section 2.2) ─────────────────────────────────

const DEFAULT_SESSIONS: MilestoneSession[] = [
  {
    number: 1,
    name: "Intake Session — קליטה",
    timing: "שבוע 0 (לפני תחילת התהליך)",
    responsible: "בן + אביתר",
    duration: "90 דקות",
  },
  {
    number: 2,
    name: "הרעיון הגדול",
    timing: "שבוע 4 (בכפוף לאישור בכתב שכל Deliverables של שלב א׳ הוגשו)",
    responsible: "אביתר",
    duration: "90 דקות",
  },
  {
    number: 3,
    name: "בדיקת אמצע דרך",
    timing: "שבוע 8 (סיום חודש 2)",
    responsible: "בן",
    duration: "45 דקות",
  },
  {
    number: 4,
    name: "פגישה סופית",
    timing: "עם סיום הטמעת כלל הנכסים",
    responsible: "אביתר",
    duration: "60–90 דקות",
  },
];

// ── Helper Components ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function SubSection({ children }: { children: string }) {
  return <Text style={styles.subSectionTitle}>{children}</Text>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  return <Text style={styles.bullet}>• {children}</Text>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label} </Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ── Session Table ─────────────────────────────────────────────────────────────

function SessionTable({ sessions }: { sessions: MilestoneSession[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCellNum}>#</Text>
        <Text style={styles.tableHeaderCell}>שם הפגישה</Text>
        <Text style={styles.tableHeaderCell}>מועד</Text>
        <Text style={styles.tableHeaderCell}>אחראי</Text>
        <Text style={styles.tableHeaderCell}>משך</Text>
      </View>
      {sessions.map((s, i) => (
        <View key={s.number} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={styles.tableCellNum}>{s.number}</Text>
          <Text style={styles.tableCell}>{s.name}</Text>
          <Text style={styles.tableCell}>{s.timing}</Text>
          <Text style={styles.tableCell}>{s.responsible}</Text>
          <Text style={styles.tableCell}>{s.duration}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Payment Table ─────────────────────────────────────────────────────────────

function PaymentTable({ price, paymentTerms, paymentPlan }: { price: string; paymentTerms: string; paymentPlan: string }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>מסלול</Text>
        <Text style={styles.tableHeaderCell}>פירוט</Text>
        <Text style={styles.tableHeaderCell}>סה"כ</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={styles.tableCell}>{paymentPlan}</Text>
        <Text style={styles.tableCell}>{paymentTerms}</Text>
        <Text style={styles.tableCell}>{price}</Text>
      </View>
    </View>
  );
}

// ── Main Document ────────────────────────────────────────────────────────────

function ContractDocument({ data }: { data: ContractData }) {
  const sessions = data.sessions ?? DEFAULT_SESSIONS;

  const renderPage = (pageNum: number, total: number, children: React.ReactNode) => (
    <Page size="A4" style={styles.page}>
      {children}
      <Text style={styles.pageNumber} render={() => `${total} / ${pageNum}`} fixed />
    </Page>
  );

  return (
    <Document
      title={`הסכם שירות — תוכנית שגרירים EDEN — ${data.clientName}`}
      author="EDEN™"
      language="he"
    >
      {/* ── Page 1: Header + Parties + Section 1 ── */}
      {renderPage(1, 8,
        <>
          <Text style={styles.mainTitle}>הסכם שירות — תוכנית שגרירים ™EDEN</Text>

          <SectionTitle>פרטי הצדדים</SectionTitle>

          {/* Service Provider */}
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>נותן השירות</Text>
            <InfoRow label="שם:" value="™EDEN שותפים: בן לוי ואביתר טוויטו" />
            <InfoRow label="ח.פ. / עוסק מורשה:" value="322569773" />
            <InfoRow label="כתובת:" value="התפוח 10 א', ראשון לציון" />
            <InfoRow label={'דוא"ל:'} value="ben.evyatar.one@gmail.com" />
            <InfoRow label="טלפון:" value="052-6605581 | 053-9581582" />
          </View>

          {/* Client */}
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>מקבל השירות ("הלקוח")</Text>
            <InfoRow label="שם מלא:" value={data.clientName} />
            <InfoRow label="ת.ז.:" value={data.clientIdNumber} />
            <InfoRow label="כתובת:" value={data.clientAddress} />
            <InfoRow label="טלפון:" value={data.clientPhone} />
            <InfoRow label={'דוא"ל:'} value={data.clientEmail} />
            <InfoRow label="תאריך תחילת השירות:" value={data.startDate} />
          </View>

          <View style={styles.divider} />

          {/* Section 1 */}
          <SectionTitle>1. הגדרות</SectionTitle>

          <SubSection>1.1 הגדרות בסיסיות</SubSection>
          <Bullet>"™EDEN" — תוכנית הטמעה עסקית המופעלת על ידי בן לוי ואביתר טוויטו, ביחד.</Bullet>
          <Bullet>"תוכנית שגרירים" — מסלול הטמעה מוגבל לעשרה משתתפים, המאפשר ליחידים לבנות תשתית עסקית מלאה תוך 4 חודשים, תמורת מחיר מוזל בתמורה לתיעוד ופרסום התהליך.</Bullet>
          <Bullet>"Deliverables" — נכסים שהלקוח מחויב לבנות ולהגיש לאישור בכל שלב, בהתאם למפת הנכסים המצורפת.</Bullet>
          <Bullet>"ימי עסקים" — ימים א'–ה', בלא ימי חג ושבת.</Bullet>
          <Bullet>"הקלטות" — הקלטות ווידאו של פגישות הזום כולן.</Bullet>
          <Bullet>"מפת הנכסים" — המסמך "מפת נכסים ובקרה — ™EDEN שגרירים" המהווה נספח בלתי נפרד מהסכם זה.</Bullet>
          <Bullet>"חומרי התוכנית" — כל החומרים, המודלים, התבניות, הסרטונים, המצגות, הקבצים, חוברות העבודה, וכל IP שמועבר ללקוח במסגרת תוכנית השגרירים.</Bullet>
          <Bullet>"IP קנייני" — רעיונות, מודלים, frameworks ושמות סימנים מסחריים של ™EDEN (כגון: Base Audience™, One Way™, Digital Seduction™, Cash Back™, Dynamic Offers™, Banger™, Trip™, Sales Kit™, 2030™, וכדומה).</Bullet>
          <Bullet>"תוצרי הלקוח" — כל התוכן, המסרים, המבנים והמערכות שהלקוח מייצר במהלך התוכנית לעסק שלו.</Bullet>
          <Bullet>"הצוות המוביל" — בן לוי ואביתר טוויטו, נותני השירות הישירים.</Bullet>
          <Bullet>"תחילת השירות" — המועד בו הלקוח מתקבל לקבוצת ה-WhatsApp של התוכנית או מועד פגישה 1 (Intake Session) — המוקדם מביניהם.</Bullet>
          <Bullet>"שירותים שנצרכו" — ראה נוסחה בסעיף 5.5.</Bullet>
        </>
      )}

      {/* ── Page 2: Section 2 — מהות השירות ── */}
      {renderPage(2, 8,
        <>
          <SectionTitle>2. מהות השירות</SectionTitle>

          <SubSection>2.1 מסגרת כללית</SubSection>
          <Body>™EDEN מתחייבת ללוות את הלקוח בתהליך הטמעה עסקית למשך 4 חודשים, הכולל את המרכיבים הבאים:</Body>

          <SubSection>2.2 נקודות מפתח — 4 Milestone Sessions</SubSection>
          <Body>התוכנית מבוססת על ליווי מתמשך ולא על פגישות שבועיות — כי יש לך: מנגנוני בקרה שוטפים עם ™EDEN בכל שלב, מענה עד 24 שעות בימי עסקים לכל שאלה והגשה, ליווי והנחיות מותאמות אישית על כל Deliverable, חוברות עבודה לכל שלב — תוכן מוכן ליישום, ליטושים משותפים על כל נכס שמוגש לאישור.</Body>
          <Body>4 נקודות המפתח להלן הן בונוס שגרירים — זומים מובנים שנועדו להפיק מקסימום תוצאות בנקודות הקריטיות של התהליך.</Body>

          <SessionTable sessions={sessions} />

          <View style={styles.noteBox}>
            <Text style={styles.body}>הבהרה: הליווי הוא יומיומי — WhatsApp, מנגנוני בקרה, חוברות עבודה, ופידבק שוטף. 4 נקודות המפתח לעיל הן בונוס שגרירים בלבד.</Text>
          </View>

          <SubSection>2.3 תקשורת שוטפת</SubSection>
          <Bullet>ערוץ ראשי: קבוצת WhatsApp משותפת — הלקוח, בן לוי, ואביתר טוויטו</Bullet>
          <Bullet>זמן תגובה: עד 24 שעות בימי עסקים (א'–ה', 10:00–18:00)</Bullet>
          <Bullet>היקף: שאלות, הגשת Deliverables לאישור, פידבק שוטף</Bullet>

          <SubSection>2.4 בונוס שגרירים — תקופת השירות המלאה (10 חודשים)</SubSection>
          <Body>שלב א' — תוכנית פעילה (חודשים 1–4): גישה מלאה לכל חומרי התוכנית, תבניות, כלים, פגישות מפתח, ולינוי WhatsApp. תקופה זו מהווה את תקופת ההטמעה המלאה.</Body>
          <Body>שלב ב' — תקופת קהילה (חודשים 5–10): בתום 4 חודשי ההטמעה, הלקוח יקבל גישה חינמית לקהילת שגרירים למשך 6 חודשים נוספים, הכוללת: גישה לקבוצת Slack הייעודית לשגרירים, השתתפות בזומים קבוצתיים, עדכוני מערכת ותוכן חדש שנוסף לפלטפורמה.</Body>
          <Body>סיום תקופת השירות (לאחר 10 חודשים): בתום 10 החודשים, גישת הלקוח לפלטפורמת ™EDEN ולכל ערוצי התוכנית (Slack, זומים, חומרי תוכנית) תסתיים. הלקוח ישמור על כל הנכסים שבנה עבור עצמו.</Body>

          <SubSection>2.5 שאלון קליטה</SubSection>
          <Body>הלקוח ימלא שאלון קליטה לפני פגישה 1. לא ייקבע מועד לפגישה 1 ללא השלמת השאלון.</Body>
        </>
      )}

      {/* ── Page 3: Section 3 — תמחור ותשלום ── */}
      {renderPage(3, 8,
        <>
          <SectionTitle>3. תמחור ותשלום</SectionTitle>

          <SubSection>3.1 מסלול התשלום שנבחר</SubSection>
          <PaymentTable
            price={data.price}
            paymentTerms={data.paymentTerms}
            paymentPlan={data.paymentPlan}
          />
          <Body>מחיר מקורי (למשתתפים שאינם שגרירים): ₪32,000–₪40,000 בהתאם לחבילה. המחיר המוזל ניתן בתמורה מפורשת לתפקיד הלקוח כשגריר מתועד (ראה סעיף 4.3).</Body>

          <SubSection>3.2 תנאי תשלום</SubSection>
          <Body>תשלום ראשון: תנאי לכניסה לתוכנית. ישולם לא יאוחר מ-7 ימים ממועד חתימת הסכם זה.</Body>
          <Body>תשלומים עוקבים: חיוב קבוע ביום קלנדרי זהה לתשלום הראשון, בכל חודש עוקב, עד השלמת מלוא מספר התשלומים שנבחר.</Body>
          <Body>אמצעי תשלום: אשראי — חיוב קבוע חודשי דרך מערכת תשלומים מאובטחת. מחייב כרטיס בתוקף לאורך כל תקופת התשלומים. העברה בנקאית — לתשלום חד-פעמי בלבד (מסלול C). פרטי המוטב: שם: בן לוי, בנק ONE ZERO | מספר בנק: 18 | סניף: 001 | חשבון: 224716259. יש לציין בהעברה: שם הלקוח + "EDEN שגרירים".</Body>

          <SubSection>3.3 חשבונית מס</SubSection>
          <Body>™EDEN תנפיק חשבונית מס כדין בתוך 7 ימים מקבלת כל תשלום.</Body>

          <SubSection>3.4 עיכוב בתשלום</SubSection>
          <Bullet>עד 7 ימים: תזכורת ידידותית.</Bullet>
          <Bullet>8–30 ימים: ריבית פיגורים — ריבית בנק ישראל + 4% שנתי, על בסיס יומי.</Bullet>
          <Bullet>+31 ימים: השעיית גישה מיידית לכל ערוצי התוכנית + אפשרות לביטול הסכם וחיוב מלוא היתרה בבת אחת.</Bullet>

          <SubSection>3.5 Acceleration Clause — חיוב מלוא היתרה</SubSection>
          <View style={styles.importantBox}>
            <Text style={styles.body}>ביטול או הפסקת השתתפות בתוכנית אינם משחררים את הלקוח מחובת תשלום מלוא מחיר התוכנית. כל התשלומים שטרם שולמו יהפכו לחייבי תשלום מיידי עם מסירת הודעת הביטול, ללא קשר להשתתפות בפועל.</Text>
          </View>
        </>
      )}

      {/* ── Page 4: Sections 4–5 ── */}
      {renderPage(4, 8,
        <>
          <SectionTitle>4. התחייבויות הלקוח</SectionTitle>

          <SubSection>4.1 שעות ומשאבים</SubSection>
          <Body>הלקוח מאשר כי ידרש להשקיע זמן ומשאבים בבניית הנכסים במהלך התוכנית. היקף ההשקעה הנדרש תלוי בשלב ובמורכבות הנכסים — לא מובטח היקף קבוע. הלקוח מצהיר כי בחר בתוכנית מתוך הבנה שנדרשת עמידה עצמאית בכל Deliverables.</Body>

          <SubSection>4.2 Deliverables ותיעוד</SubSection>
          <Bullet>הלקוח יגיש את כל ה-Deliverables בהתאם למפת הנכסים.</Bullet>
          <Bullet>הגשה תיעשה לאישור ™EDEN לפני כל מעבר לשלב הבא (בהתאם לצבעי הרמזור במפת הנכסים).</Bullet>
          <Bullet>הלקוח יתעד את התהליך באמצעים שיסוכמו עם ™EDEN.</Bullet>

          <SubSection>4.3 התחייבויות השגריר</SubSection>
          <Body>הלקוח מאשר בחתימתו כי:</Body>
          <Bullet>א. עדות: יספק עדות מצולמת בתום התוכנית, שתשמש את ™EDEN.</Bullet>
          <Bullet>ב. פרסום תהליך ותוצאות: נותן רשות ל-™EDEN לפרסם את תהליכו, תוצאותיו וחומרים מתועדים מהתוכנית — לרבות ברשתות חברתיות, חומרי שיווק, ואתר — ללא תשלום נוסף.</Bullet>
          <Bullet>ג. הבנת מבנה המחיר: הלקוח מבין ומאשר כי המחיר המוזל ניתן בתמורה מפורשת לתפקידו כשגריר מתועד ולא בשל כל סיבה אחרת.</Bullet>

          <SubSection>4.4 תוכן שוטף</SubSection>
          <Body>החל מהשבוע השמיני ועד לסיום התוכנית, הלקוח מתחייב לפרסם תוכן לפי הנהלים הבאים — תנאי לזכאות לערבות הביצועים (ראה סעיף 13): לפחות לונג פורמט אחד בשבוע; לפחות 3 שורט פורמטים בשבוע. התוכן יתבצע לפי נהלי ™EDEN.</Body>

          <View style={styles.divider} />

          <SectionTitle>5. ביטול וסיום</SectionTitle>

          <SubSection>5.1 זכות ביטול לפי חוק הגנת הצרכן</SubSection>
          <Body>בהתאם לחוק הגנת הצרכן ותקנות הגנת הצרכן (ביטול עסקה), תשע"א, 2010, הלקוח זכאי לבטל את העסקה תוך 14 ימים מיום חתימת ההסכם או מיום תחילת השירות — המאוחר מביניהם, בכפוף לתנאים הבאים:</Body>
          <Bullet>הודעת ביטול בכתב (דוא"ל / מכתב רשום)</Bullet>
          <Bullet>ביטול אפשרי גם אם השירות החל (תוכנית מתמשכת)</Bullet>
          <Bullet>החברה רשאית לגבות דמי ביטול של 5% ממחיר התוכנית או ₪100 — הנמוך מביניהם</Bullet>
          <Body>החזר כספי: ™EDEN תשיב את התשלום בתוך 14 ימים מקבלת הודעת הביטול, בניכוי דמי ביטול ובניכוי שווי שירותים שנצרכו לפי נוסחה בסעיף 5.5.</Body>

          <SubSection>5.3 ביטול מיוזמת הלקוח לאחר תקופת הביטול</SubSection>
          <Body>לאחר 14 הימים, הלקוח רשאי להודיע על הפסקת השתתפות בכתב לדוא"ל ben.evyatar.one@gmail.com בכל עת. תחול המדיניות הבאה:</Body>
          <Bullet>א. אין החזר חלקי לאחר תחילת השירות, למעט המפורט בסעיפים 5.1 ו-13.</Bullet>
          <Bullet>ב. מלוא יתרת התשלומים נותרת חייבת ומיידית לתשלום, בהתאם לאמור בסעיף 3.5 (Acceleration Clause).</Bullet>
          <Bullet>ג. הקפאה חד-פעמית: לקוח שנבצר ממנו להמשיך מסיבות חריגות מוכחות (מחלה קשה / אסון משפחתי) רשאי לבקש הקפאה חד-פעמית של עד 60 יום, בכפוף לאישור כתוב של ™EDEN. הקפאה לא תיחשב ביטול ולא תקנה החזר.</Bullet>
          <Bullet>ד. בכל מקרה של ביטול — הודעה בכתב 14 ימים מראש.</Bullet>

          <SubSection>5.5 נוסחת שווי שירותים שנצרכו</SubSection>
          <View style={styles.noteBox}>
            <Text style={styles.body}>שווי שירותים שנצרכו = (מספר Milestone Sessions שנוצלו ÷ 4) × מחיר התוכנית</Text>
          </View>
          <Body>גישה לקבוצת WhatsApp: כל שבוע שהלקוח היה בעל גישה פעילה = שווה ערך ל-0.25 פגישה. תקרת חיוב: שווי שירותים שנצרכו לא יעלה על 100% ממחיר התוכנית, בכל מקרה.</Body>
        </>
      )}

      {/* ── Page 5: Sections 6–9 ── */}
      {renderPage(5, 8,
        <>
          <SectionTitle>6. הקלטות ופרסום</SectionTitle>

          <SubSection>6.1 הקלטות פגישות</SubSection>
          <Body>הפגישות יוקלטו. ההקלטות יישמרו ב-database האישי של הלקוח כחלק ממערכת הזיכרון שלו.</Body>

          <SubSection>6.2 הרשאות פרסום</SubSection>
          <Body>הסכמה מראש: בחתימה על הסכם זה, הלקוח מעניק ל-™EDEN הסכמה מראש לעשות שימוש בתכנים הבאים לצרכי שיווק ותיעוד:</Body>
          <Bullet>קטעי הקלטות — מפגישות הזום ומהתהליך המתועד.</Bullet>
          <Bullet>עדויות כתובות ומצולמות.</Bullet>
          <Bullet>נתוני תוצאות ותהליך (ניתן לפרסם בעילום שם אם הלקוח ביקש זאת).</Bullet>
          <Body>מנגנון הודעה מראש: לפני כל פרסום של קטע הקלטה, ™EDEN תשלח ללקוח הודעה בכתב 48 שעות מראש. הודעה זו אינה בקשת הסכמה חדשה — ההסכמה ניתנה בחתימה — אלא הזדמנות להתנגדות ספציפית.</Body>
          <Body>זכות התנגדות ספציפית: הלקוח רשאי, תוך 48 שעות, להגיש התנגדות מנומקת לפרסום קטע ספציפי אם קיים נימוק סביר (פרטיות, מידע מסחרי רגיש וכדומה).</Body>

          <View style={styles.divider} />

          <SectionTitle>7. התחייבויות השירות (SLA)</SectionTitle>

          <SubSection>7.1 ™EDEN מתחייבת לספק ללקוח, לכל הפחות:</SubSection>
          <Bullet>א. פגישות Milestone: 4 פגישות מפתח כמפורט בסעיף 2.2. פגישה שבוטלה תתוזמן מחדש תוך 7 ימים או תוחלף בהקלטה ייעודית.</Bullet>
          <Bullet>ב. זמן תגובה: תגובה ראשונית ב-WhatsApp תוך 24 שעות בימי עסקים (א'–ה', 08:00–18:00).</Bullet>
          <Bullet>ג. משוב על תוצרים: משוב מפורט על כל Deliverable שהוגש — תוך 72 שעות בימי עסקים.</Bullet>

          <View style={styles.divider} />

          <SectionTitle>8. קניין רוחני (IP)</SectionTitle>

          <SubSection>8.1 בעלות ה-IP של ™EDEN</SubSection>
          <Body>כל חומרי התוכנית — חוברות עבודה, תבניות, שיטות עבודה, כלים, מודלים, IP קנייני, שמות סימנים מסחריים — הם רכושה הבלעדי של ™EDEN / בן לוי ואביתר טוויטו. הלקוח רוכש רישיון שימוש אישי מוגבל למשך 10 חודשים מיום ההצטרפות.</Body>

          <SubSection>8.2 בעלות ה-IP של הלקוח</SubSection>
          <Body>נכסים שיצר הלקוח במסגרת התוכנית (שיטה, מותג, תכנים, IP) — שייכים ללקוח. ™EDEN לא רוכשת זכויות על תוצרי הלקוח, אך רשאית להשתמש בהם כדוגמאות אנונימיות בכפוף לאישור בכתב.</Body>

          <SubSection>8.4 גבולות IP — מה מותר ומה אסור</SubSection>
          <Body>הלקוח רשאי: ליישם עקרונות שלמד בתוכנית בעסק שלו; לבנות framework עצמאי בהשראת עקרונות שנלמדו; להמשיך להשתמש בנכסים שבנה בעצמו ללא הגבלת זמן.</Body>
          <Body>הלקוח מתחייב שלא: ללמד, לשווק, למכור, או להעביר את שיטות ™EDEN בשמן לצד שלישי; להשתמש בשמות מסחריים של ™EDEN בשיווק שלו; להעתיק מילולית חומרי תוכנית או ליצור עבודות נגזרות ישירות.</Body>

          <SubSection>8.5 הפרת IP</SubSection>
          <Body>במקרה של הפרת סעיף זה, הלקוח יחויב בפיצוי מוסכם של פי 3 ממחיר התוכנית, ומבלי לגרוע מכל סעד אחר.</Body>

          <View style={styles.divider} />

          <SectionTitle>9. סודיות</SectionTitle>

          <SubSection>9.1 מידע סודי</SubSection>
          <Body>סודיות של ™EDEN: שיטות עבודה, תהליכים פנימיים, נהלים, חוברות עבודה; מידע על שגרירים ולקוחות אחרים; מידע עסקי פנימי.</Body>
          <Body>סודיות של הלקוח: פרטים אישיים (מידע אישי, פיננסי, עסקי); יעדים, אתגרים, מצבים רגישים שנחשפו במהלך הליווי.</Body>

          <SubSection>9.3 תקופת הסודיות</SubSection>
          <Body>התחייבות זו תישאר בתוקף למשך 5 שנים מתום תקופת השירות.</Body>

          <SubSection>9.4 הפרת סודיות</SubSection>
          <Body>הפרת התחייבות זו תזכה את הצד הניזוק בפיצוי כספי מוסכם של פי 3 ממחיר התוכנית, צו מניעה מבית המשפט, וכל סעד אחר שיקבע בית המשפט.</Body>
        </>
      )}

      {/* ── Page 6: Sections 10–12 ── */}
      {renderPage(6, 8,
        <>
          <SectionTitle>10. הגנת הפרטיות</SectionTitle>

          <SubSection>10.1 רקע חוקי</SubSection>
          <Body>השירות כפוף לחוק הגנת הפרטיות, התשמ"א-1981 ולתיקון 13 משנת 2024.</Body>

          <SubSection>10.2 איסוף מידע</SubSection>
          <Body>במהלך התוכנית, ™EDEN תאסוף ותעבד: פרטי זהות (שם מלא, דוא"ל, טלפון, כתובת); מידע עסקי (תחום עיסוק, יעדים עסקיים); מידע תקשורתי (שיחות, הודעות, שאלות בקבוצת WhatsApp ובמפגשי הזום); נתוני שימוש (כניסות למפגשים, התקדמות במשימות).</Body>

          <SubSection>10.4 שימוש בכלי AI</SubSection>
          <Body>™EDEN עשויה להשתמש בכלי בינה מלאכותית (כגון Claude, ChatGPT) לצורך ניתוח, שיפור ומתן משוב על תוצרי הלקוח. מידע שנשלח לכלים אלו מעובד באופן אנונימי ככל הניתן.</Body>

          <SubSection>10.6 זכויות הלקוח</SubSection>
          <Bullet>עיון במידע שנאסף עליו</Bullet>
          <Bullet>תיקון מידע שגוי</Bullet>
          <Bullet>מחיקת מידע בתום תקופת השירות (למעט מידע חשבונאי כנדרש בחוק)</Bullet>
          <Bullet>התנגדות לשימוש במידע למטרות שיווק</Bullet>
          <Body>פניות בנושא פרטיות: ben.evyatar.one@gmail.com</Body>

          <View style={styles.divider} />

          <SectionTitle>11. הגבלת אחריות ושיפוי</SectionTitle>

          <SubSection>11.1 אופי השירות</SubSection>
          <Body>תוכנית שגרירים ™EDEN היא שירות של ליווי, הדרכה וייעוץ עסקי. ™EDEN אינה מתחייבת לתוצאות מסחריות ספציפיות (כגון: מספר לקוחות, הכנסות, או רווחים).</Body>

          <SubSection>11.2 מה ™EDEN לא אחראית לו</SubSection>
          <Bullet>אי-השגת יעדי הכנסה/רווחים ספציפיים</Bullet>
          <Bullet>נזקים עקיפים, אובדן רווחים, או נזקים נלווים</Bullet>
          <Bullet>החלטות עסקיות שהלקוח מקבל בעקבות הליווי</Bullet>
          <Bullet>שימוש לא נכון בחומרי התוכנית</Bullet>
          <Bullet>כשלים טכניים מחוץ לשליטת ™EDEN (תקלות בזום, WhatsApp, ספקי אינטרנט)</Bullet>

          <SubSection>11.3 תקרת אחריות</SubSection>
          <Body>האחריות הכוללת של ™EDEN לא תעלה על סכום התשלום ששולם בפועל על ידי הלקוח.</Body>

          <SubSection>11.4 שיפוי</SubSection>
          <Body>הלקוח מתחייב לשפות את ™EDEN ואת השותפים בגין כל תביעה, נזק, או הוצאה הנובעת משימוש שלא כדין בחומרים שניתנו לו, או מהפרת הסכם זה.</Body>

          <View style={styles.divider} />

          <SectionTitle>12. Non-Disparagement — איסור פרסום שלילי</SectionTitle>

          <SubSection>12.1 התחייבות הדדית</SubSection>
          <Body>הצדדים מתחייבים שלא לפרסם, להפיץ, או לשתף תוכן שלילי, מזלזל, או פוגעני אחד על השני ברשתות חברתיות, אתרי ביקורות, פורומים, קבוצות WhatsApp, או כל פלטפורמה ציבורית אחרת — הן במהלך תקופת ההסכם והן לאחריו.</Body>

          <SubSection>12.3 הפרה</SubSection>
          <Body>הפרת סעיף זה מהווה הפרה יסודית ומזכה את הצד הניזוק בפיצוי מוסכם של פי 3 ממחיר התוכנית ובכל סעד אחר הקבוע בדין.</Body>
        </>
      )}

      {/* ── Page 7: Sections 13–17 ── */}
      {renderPage(7, 8,
        <>
          <SectionTitle>13. ערבות ביצועים — Conditional Performance Guarantee</SectionTitle>

          <SubSection>13.1 הערבות — "נלווה אותך עד שזה קורה"</SubSection>
          <Body>לקוח שעמד בכל תנאי הזכאות (סעיף 13.2) ולא השיב את השקעתו בהכנסות מלקוחות עד סיום תקופת הליווי — ™EDEN תמשיך ללוות אותו ללא תשלום נוסף עד שזה יקרה.</Body>

          <SubSection>13.2 תנאי הזכאות (כולם יחד — אין חריגים)</SubSection>
          <Bullet>א. עמד במודל התמרור בכל שלבי התוכנית.</Bullet>
          <Bullet>ב. נכח בכל פגישות המפתח — או תיאם פגישה חלופית מראש ובכתב לכל פגישה שנעדר ממנה.</Bullet>
          <Bullet>ג. פרסם תוכן לפי נהלי ™EDEN מהשבוע השמיני: לפחות לונג פורמט אחד בשבוע ו-3 שורט פורמטים בשבוע.</Bullet>
          <Bullet>ד. הגיש בקשה לפעלת הערבות בכתב תוך 14 יום מתאריך סיום התוכנית, בצירוף תיעוד מלא.</Bullet>

          <View style={styles.divider} />

          <SectionTitle>14. המשכיות שירות (Key Person)</SectionTitle>

          <SubSection>14.1 הצוות המוביל</SubSection>
          <Body>התוכנית מסופקת על ידי בן לוי ואביתר טוויטו ("הצוות המוביל").</Body>

          <SubSection>14.2 אי-זמינות של אחד מחברי הצוות מעל 14 ימים רצופים</SubSection>
          <Bullet>™EDEN תספק מחליף מוסמך, או החבר השני ימשיך לספק את השירות במלואו.</Bullet>
          <Bullet>הלקוח יקבל הודעה בכתב תוך 48 שעות.</Bullet>

          <View style={styles.divider} />

          <SectionTitle>15. יישוב סכסוכים</SectionTitle>

          <SubSection>15.2 סמכות שיפוט</SubSection>
          <Body>אם לא ניתן ליישב את המחלוקת בדרכי שלום, סמכות השיפוט הבלעדית תהיה לבית המשפט המוסמך בתל אביב-יפו.</Body>

          <SubSection>15.4 דין חל</SubSection>
          <Body>על הסכם זה יחול הדין הישראלי בלבד.</Body>

          <View style={styles.divider} />

          <SectionTitle>16. חתימה דיגיטלית</SectionTitle>

          <SubSection>16.1 תקפות</SubSection>
          <Body>הצדדים מסכימים כי חתימה דיגיטלית על הסכם זה תהיה תקפה ומחייבת לפי חוק חתימה אלקטרונית, התשס"א-2001.</Body>

          <SubSection>16.3 הודעות משפטיות — ערוצים תקפים</SubSection>
          <Bullet>דוא"ל עם אישור קריאה (נחשבת נמסרת 24 שעות מזמן שליחה)</Bullet>
          <Bullet>דואר רשום (נחשב נמסר 5 ימי עסקים מהמשלוח)</Bullet>
          <Body>הודעות דרך WhatsApp תקפות לתקשורת שוטפת בלבד — לא להודעות משפטיות.</Body>

          <View style={styles.divider} />

          <SectionTitle>17. תנאים כלליים</SectionTitle>

          <SubSection>17.1 שלמות ההסכם</SubSection>
          <Body>הסכם זה, לרבות מפת הנכסים המצורפת, מהווה את מלוא ההסכמה בין הצדדים ומבטל כל הבנה, התכתבות, או הסכמה קודמת.</Body>

          <SubSection>17.4 ניתוק הוראה פסולה (Severability)</SubSection>
          <Body>אם תקבע ערכאה משפטית כי הוראה כלשהי בהסכם זה אינה תקפה — שאר ההוראות יישארו בתוקפן המלא.</Body>

          <SubSection>17.5 העברת זכויות</SubSection>
          <Body>הלקוח אינו רשאי להעביר את זכויותיו או חובותיו לצד שלישי ללא הסכמת ™EDEN בכתב מראש.</Body>
        </>
      )}

      {/* ── Page 8: Section 18 + Signature Block ── */}
      {renderPage(8, 8,
        <>
          <SectionTitle>18. הסכמת הלקוח ואישור</SectionTitle>
          <Body>הלקוח מצהיר כי בחתימה על הסכם זה כל הרשום מטה נכון:</Body>

          <View style={styles.spacer} />
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>קראתי את ההסכם בקפידה ובעיון</Text></View>
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>הבנתי את כל התנאים והסעיפים</Text></View>
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>אני מודע לכך שהשירות הוא ליווי ולא התחייבות לתוצאות</Text></View>
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>אני מבין ומסכים לתנאי התשלום ולמדיניות הביטול</Text></View>
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>אני מסכים לסעיף Acceleration Clause (3.5)</Text></View>
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>אני מתחייב לעמוד בהתחייבויות השגריר (סעיף 4.3)</Text></View>
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>אני מתחייב לשמור על סודיות ולכבד את זכויות ה-IP של ™EDEN</Text></View>
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>אני מבין שרישיון השימוש בחומרים מסתיים עם סיום ההסכם (סעיף 8.3)</Text></View>
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>הבנתי את מדיניות הפרטיות ואת השימוש בכלי AI (סעיף 10.4)</Text></View>
          <View style={styles.checkboxRow}><View style={styles.checkbox} /><Text style={styles.body}>הבנתי את תנאי Non-Disparagement (סעיף 12)</Text></View>

          {data.specialNotes ? (
            <>
              <View style={styles.divider} />
              <SubSection>הערות מיוחדות</SubSection>
              <View style={styles.noteBox}>
                <Text style={styles.body}>{data.specialNotes}</Text>
              </View>
            </>
          ) : null}

          {/* Signature block — PowerDoc overlays the client signature field (see absolute target below) */}
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>חתימות</Text>

            {/* Service provider signatures */}
            <View style={styles.signatureParty}>
              <Text style={styles.signaturePartyTitle}>נותן השירות — ™EDEN</Text>

              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>שם: בן לוי | תפקיד: מנהל שותף</Text>
                <Text style={styles.signatureLabel}>חתימה:</Text>
                <View style={styles.signatureLineDash} />
                <Text style={styles.signatureLabel}>תאריך:</Text>
                <View style={styles.signatureLineDash} />
              </View>

              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>שם: אביתר טוויטו | תפקיד: מנהל שותף</Text>
                <Text style={styles.signatureLabel}>חתימה:</Text>
                <View style={styles.signatureLineDash} />
                <Text style={styles.signatureLabel}>תאריך:</Text>
                <View style={styles.signatureLineDash} />
              </View>
            </View>

            {/* Client party — identity line (signature target is absolutely positioned below) */}
            <View style={styles.signatureParty}>
              <Text style={styles.signaturePartyTitle}>מקבל השירות — הלקוח</Text>

              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>שם מלא:</Text>
                <Text style={[styles.infoValue, { flex: 1 }]}>{data.clientName}</Text>
                <Text style={styles.signatureLabel}>ת.ז.:</Text>
                <Text style={[styles.infoValue, { flex: 1 }]}>{data.clientIdNumber}</Text>
              </View>
            </View>
          </View>

          {/*
            ── PowerDoc EOT signature target — ABSOLUTELY positioned, deterministic coords ──
            SSOT: src/lib/contract-signature-layout.ts. react-pdf v4 absolute = page-edge
            origin (verified, no padding offset), so these points map 1:1 to PowerDoc %.
            The interactive signature field is overlaid by PowerDoc at exactly these coords.
          */}
          <Text
            style={{
              position: "absolute",
              top: SIGNATURE_FIELD.top - 14,
              left: SIGNATURE_FIELD.left,
              width: SIGNATURE_FIELD.width,
              fontSize: 9.5,
              fontFamily: "Heebo",
              color: "#555",
              textAlign: "right",
            }}
          >
            חתימת הלקוח:
          </Text>
          <View
            style={{
              position: "absolute",
              top: SIGNATURE_FIELD.top,
              left: SIGNATURE_FIELD.left,
              width: SIGNATURE_FIELD.width,
              height: SIGNATURE_FIELD.height,
              border: "1pt dashed #888",
              borderRadius: 3,
              backgroundColor: "#fafafa",
            }}
          />

          <Text
            style={{
              position: "absolute",
              top: SIGNATURE_DATE_FIELD.top - 13,
              left: SIGNATURE_DATE_FIELD.left,
              width: SIGNATURE_DATE_FIELD.width,
              fontSize: 9.5,
              fontFamily: "Heebo",
              color: "#555",
              textAlign: "right",
            }}
          >
            תאריך חתימה:
          </Text>
          <View
            style={{
              position: "absolute",
              top: SIGNATURE_DATE_FIELD.top + SIGNATURE_DATE_FIELD.height,
              left: SIGNATURE_DATE_FIELD.left,
              width: SIGNATURE_DATE_FIELD.width,
              borderBottomWidth: 1,
              borderBottomColor: "#888",
            }}
          />
        </>
      )}
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a contract PDF buffer for the given client data.
 * Runs server-side only (uses react-pdf renderToBuffer).
 */
export async function generateContractPdf(data: ContractData): Promise<Buffer> {
  const buffer = await renderToBuffer(<ContractDocument data={data} />);
  return Buffer.from(buffer);
}
