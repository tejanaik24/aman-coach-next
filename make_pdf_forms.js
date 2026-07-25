const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const downloadsDir = path.join(process.env.USERPROFILE || "C:\\Users\\user", "Downloads");

function createPdf(title, subtitle, sections, filename) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  function addHeader() {
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setFillColor(255, 184, 0);
    doc.rect(0, 27, pageWidth, 1.5, "F");

    doc.setTextColor(255, 184, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("AK FITNESS — #TEAMAKF", 14, 12);

    doc.setTextColor(220, 220, 220);
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), 14, 20);

    y = 36;
  }

  function checkPageBreak(neededHeight = 12) {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      addHeader();
    }
  }

  addHeader();

  if (subtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const splitSub = doc.splitTextToSize(subtitle, pageWidth - 28);
    doc.text(splitSub, 14, y);
    y += splitSub.length * 4.5 + 4;
  }

  sections.forEach((sec, idx) => {
    checkPageBreak(16);

    // Section Header Box
    doc.setFillColor(245, 245, 245);
    doc.rect(14, y, pageWidth - 28, 8, "F");
    doc.setDrawColor(220, 220, 220);
    doc.rect(14, y, pageWidth - 28, 8, "S");

    doc.setTextColor(180, 130, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`SECTION ${idx + 1}: ${sec.title.toUpperCase()}`, 18, y + 5.5);
    y += 12;

    sec.fields.forEach((field) => {
      checkPageBreak(14);

      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      const qText = `${field.label}${field.required ? " *" : ""}`;
      const splitQ = doc.splitTextToSize(qText, pageWidth - 28);
      doc.text(splitQ, 14, y);
      y += splitQ.length * 4;

      if (field.hint) {
        checkPageBreak(8);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const splitHint = doc.splitTextToSize(`Note: ${field.hint}`, pageWidth - 28);
        doc.text(splitHint, 14, y);
        y += splitHint.length * 3.5;
      }

      // Draw response line or box
      checkPageBreak(8);
      doc.setDrawColor(210, 210, 210);
      if (field.multiline) {
        doc.rect(14, y, pageWidth - 28, 12, "S");
        y += 15;
      } else {
        doc.line(14, y + 4, pageWidth - 14, y + 4);
        y += 7;
      }
    });

    y += 4;
  });

  // Footer page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages} — Confidential Client Form`, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  const outPath = path.join(downloadsDir, filename);
  doc.save(outPath);
  console.log(`Saved PDF: ${outPath}`);
}

// ─── Form 1: Standard Joining Questionnaire ────────────────────────────────────
const standardFormSections = [
  {
    title: "Contact Information",
    fields: [
      { label: "1. Full Name", required: true },
      { label: "2. Email Address", required: true },
      { label: "3. Complete Residence Address", required: true, multiline: true },
      { label: "4. Primary Contact Number", required: true },
      { label: "5. Alternate Contact Number" }
    ]
  },
  {
    title: "General Information",
    fields: [
      { label: "1. Age & Date of Birth", required: true },
      { label: "2. Height (cm / ft-in)", required: true },
      { label: "3. Fitness & Body Transformation Goal", required: true, multiline: true },
      { label: "4. Wake Up Time", required: true },
      { label: "5. Sleep Time", required: true },
      { label: "6. Previous Coach / Nutritionist History & Reasons for leaving", multiline: true },
      { label: "7. Equipment Available at Home (Cycle, Dumbbells, Bands, etc.)", required: true }
    ]
  },
  {
    title: "Lifestyle & Training Information",
    fields: [
      { label: "1. Work Details (Sitting/Standing, Daily Timings & Hours)", required: true, multiline: true },
      { label: "2. Current Exercise Routine & Activity History", required: true, multiline: true },
      { label: "3. Present / Previous Workout Routine (Split, Exercises, Sets, Reps)", multiline: true },
      { label: "4. Daily Average Step Count (Smartwatch/Ring tracked)" },
      { label: "5. Regular Cardio Routine (Minutes per day/week, Type of cardio)" },
      { label: "6. Preferred Workout Time & Max Days per Week", required: true }
    ]
  },
  {
    title: "Health History Information",
    fields: [
      { label: "1. Injury / Pain / Stiffness / Joint Mobility / Surgery History", required: true, multiline: true },
      { label: "2. Health Issues & Genetic Disorders (PCOS, Thyroid, Diabetes, BP)", required: true, multiline: true },
      { label: "3. Prescribed Medicines & Salts", multiline: true },
      { label: "4. Constipation History & Daily Pooping Frequency", required: true },
      { label: "5. Addictions (Alcohol, Smoking, Drugs - Frequency & Amount)", required: true },
      { label: "6. Average Urine Color throughout the day" },
      { label: "7. Menstrual Health (Women: Duration, Cycle Frequency, Flow, Initial Days)", multiline: true },
      { label: "8. Anabolic Steroid / SARM / Peptide History (Competitive Athletes)", hint: "Full details of compounds, dosages, and dates", multiline: true }
    ]
  },
  {
    title: "Nutritional Information & Food Preferences",
    fields: [
      { label: "1. Dietary Preference (Vegetarian / Non-Veg / Vegan / Eggetarian)", required: true },
      { label: "2. Specific Days avoiding Non-Veg (Religious reasons)" },
      { label: "3. Lactose Intolerance Status", required: true },
      { label: "4. Present Meal Timings (Breakfast, Mid-Day, Lunch, Evening, Dinner)", multiline: true },
      { label: "5. Maximum Manageable Meals per day (3 to 5)", required: true },
      { label: "6. Pre-Workout Meal Feasibility (60-90 min before workout)", required: true },
      { label: "7. Current Supplements Taken", required: true },
      { label: "8. Whey Protein Preference & Acceptability", required: true },
      { label: "9. Food Allergies & Intolerances" },
      { label: "10. Current Daily Diet Log (Morning, Breakfast, Mid Day, Lunch, Evening, Dinner)", multiline: true },
      { label: "11. Present Daily Water Intake", required: true },
      { label: "12. Loved Foods & Hated Foods", required: true, multiline: true },
      { label: "13. Preferred Foods in Diet Plan", required: true },
      { label: "14. Palate Preference & Chocolate Preference" },
      { label: "15. Favorite Cheat / Treat Meal" },
      { label: "16. Overseas Grocery & Supplement Stores (For Abroad Clients)" }
    ]
  },
  {
    title: "Physiological Health Assessment",
    fields: [
      { label: "1. Morning Empty Stomach Blood Pressure (mmHg)" },
      { label: "2. Afternoon / Early Evening Blood Pressure" },
      { label: "3. Night Time Blood Pressure" },
      { label: "4. Blood Test & Medical Report Upload Details", hint: "Attach recent blood test / urine analysis / Dexa reports" },
      { label: "5. Additional Notes or Specific Instructions for Coach Aman", multiline: true }
    ]
  },
  {
    title: "Pictures Upload Guidelines",
    fields: [
      { label: "1. Photos for Women (Sports bra / Shorts / Sportswear)", hint: "Front, Back, Left Side, Right Side" },
      { label: "2. Photos for Men (Shirtless in trunks or shorts)", hint: "Front, Back, Left Side, Right Side" },
      { label: "3. Favorite Pose & Mandatory Poses (Athletes)" }
    ]
  },
  {
    title: "Anthropometrics (Measurements)",
    fields: [
      { label: "1. Body Weight (kg)", required: true },
      { label: "2. Neck & Abdomen at Navel (inches)", required: true },
      { label: "3. Hips & Right Arm (inches)", required: true },
      { label: "4. Right Thigh & Right Calf (inches)" },
      { label: "5. Weight History (Lowest & Heaviest Weight over last 3-5 years)" },
      { label: "6. Gym Tour Photos / Video Notes" }
    ]
  }
];

// ─── Form 2: Antenatal-Postnatal Questionnaire ─────────────────────────────────
const antenatalFormSections = [
  {
    title: "Contact Information",
    fields: [
      { label: "1. Full Name", required: true },
      { label: "2. Email Address", required: true },
      { label: "3. Primary Contact Number", required: true },
      { label: "4. Residence Address", multiline: true },
      { label: "5. Alternate Contact Number" }
    ]
  },
  {
    title: "Pregnancy & General Details",
    fields: [
      { label: "1. Age & Date of Birth" },
      { label: "2. Height (cm / ft-in)" },
      { label: "3. Gestational Age (Current Weeks Pregnant)", required: true },
      { label: "4. LMP (Last Menstrual Period Date)" },
      { label: "5. EDD (Expected Date of Delivery)" },
      { label: "6. Gravidity (Number of Pregnancies)" },
      { label: "7. Type of Pregnancy (Singleton / Twin / Other)" }
    ]
  },
  {
    title: "Lifestyle & Equipment Details",
    fields: [
      { label: "1. Wake Up Time & Sleep Time" },
      { label: "2. Past Coach / Nutritionist History" },
      { label: "3. Home Exercise Equipment (Cycle, Dumbbells, Bands)" },
      { label: "4. Work Details (Sitting/Standing, Daily Hours)" },
      { label: "5. Current Exercise & Activity Routine" },
      { label: "6. Workout Routine 3 Months Before Conceiving", multiline: true },
      { label: "7. Daily Steps & Cardio Routine" },
      { label: "8. Preferred Workout Timings" }
    ]
  },
  {
    title: "Health History & Pre-Conception Menstrual Health",
    fields: [
      { label: "1. Injury / Pain / Stiffness / Surgical History", multiline: true },
      { label: "2. Present / Past Health Issues (PCOS, Thyroid, Diabetes, BP)", multiline: true },
      { label: "3. Family History (Diabetes, Thyroid, Hypertension)", multiline: true },
      { label: "4. Palpitations, Dizziness, or Shortness of Breath Symptoms" },
      { label: "5. Prescribed Medications & Supplements (Folic Acid, Iron, Calcium)", multiline: true },
      { label: "6. Menstrual Health Pre-Conception (Duration, Cycle, Flow, Initial Days)", multiline: true }
    ]
  },
  {
    title: "Nutritional Information & Pregnancy Preferences",
    fields: [
      { label: "1. Current Supplements Taken (Prenatal Multivitamin, Folic Acid, etc.)" },
      { label: "2. Whey Protein Preference During Pregnancy" },
      { label: "3. Food Allergies & Intolerances" },
      { label: "4. Current 6-Meal Log (Morning to Night)", multiline: true },
      { label: "5. Daily Water Intake (Litres / Glasses)" },
      { label: "6. Loved Foods, Hated Foods & Nausea-Triggering Foods", multiline: true },
      { label: "7. Preferred Foods & Seasonal Fruits" },
      { label: "8. Palate Type, Chocolate Preference & Cheat Meal" },
      { label: "9. Diet Type & Timings (Veg/Non-Veg, Religious Days, Meal Times)", multiline: true }
    ]
  },
  {
    title: "Blood Pressure & Glucose Monitoring",
    fields: [
      { label: "1. Resting Blood Pressure (Morning, Afternoon, Night)" },
      { label: "2. Fasting Blood Glucose (mg/dL)" },
      { label: "3. 90-120 Min Post-Breakfast Blood Glucose" },
      { label: "4. 90-120 Min Post-Lunch Blood Glucose" },
      { label: "5. 90-120 Min Post-Dinner Blood Glucose" },
      { label: "6. Resting Heart Rate (BPM)" },
      { label: "7. Blood Scan / Urine Analysis Reports Upload Notes" },
      { label: "8. Additional Notes & Questions for Coach Aman", multiline: true }
    ]
  },
  {
    title: "Pictures Upload Guidelines",
    fields: [
      { label: "1. Present Pregnancy Photos (Front, Back, Left, Right Side)", hint: "Sports bra & shorts or comfortable sportswear" },
      { label: "2. Pre-Conception Photos (2-3 months before conceiving)" }
    ]
  },
  {
    title: "Anthropometrics (Measurements)",
    fields: [
      { label: "1. Present Body Weight (kg)" },
      { label: "2. Abdomen at Navel (inches)" },
      { label: "3. Waist around Pelvic Bone (inches)" },
      { label: "4. Hips (inches)" },
      { label: "5. Pre-Conception Average Weight & Heaviest Weight" },
      { label: "6. 1st Trimester Weight Progression (Start & End of 1st Trimester)" },
      { label: "7. Home Equipment Photos / Video Notes" }
    ]
  }
];

// ─── Form 3: Weekly Check-In Form ──────────────────────────────────────────────
const checkinFormSections = [
  {
    title: "Training Feedback",
    fields: [
      { label: "1. How are energy levels during working out?", required: true, multiline: true },
      { label: "2. How many days did you workout in past 2 weeks?" },
      { label: "3. Any workout deviations or missed sessions?", multiline: true },
      { label: "4. Any major issues with particular exercises?", multiline: true },
      { label: "5. Did you achieve Cardio / Steps Goals?", required: true, multiline: true },
      { label: "6. Any injury, aches, or joint pains?", required: true, multiline: true }
    ]
  },
  {
    title: "Diet Feedback",
    fields: [
      { label: "1. Any deviation from current diet plan (missed/cheat meals)?", required: true, multiline: true },
      { label: "2. How is your appetite & hunger levels?", required: true },
      { label: "3. How is your digestion & bloating?", required: true },
      { label: "4. Signs of constipation & stool frequency per day", required: true },
      { label: "5. Specific changes requested in diet plan", required: true, multiline: true },
      { label: "6. Food items you want to add or remove", required: true }
    ]
  },
  {
    title: "General Feedback",
    fields: [
      { label: "1. Daytime Energy Levels throughout the day", required: true },
      { label: "2. Sleep Quality & Duration (hours)", required: true },
      { label: "3. Daily Water Intake (Litres)", required: true },
      { label: "4. Urine Color throughout the day", required: true },
      { label: "5. Overall Coaching Experience & Feedback", multiline: true },
      { label: "6. Additional Notes for Coach Aman", multiline: true }
    ]
  },
  {
    title: "Anthropometrics (Measurements)",
    fields: [
      { label: "1. Morning Empty Stomach Weight (kg)", required: true },
      { label: "2. Abdomen at Navel (inches)", required: true },
      { label: "3. Hips (inches)", required: true }
    ]
  },
  {
    title: "Pictures Upload Guidelines",
    fields: [
      { label: "1. Morning Empty Stomach Progress Photos", hint: "Front View, Back View, Left Side, Right Side, Favorite Pose, Mandatory Poses" }
    ]
  }
];

createPdf(
  "Standard Joining Questionnaire",
  "Fill out all details accurately to receive your customized training & nutrition plans.",
  standardFormSections,
  "Standard_Joining_Questionnaire_Form.pdf"
);

createPdf(
  "Antenatal - Postnatal Questionnaire",
  "Specialized pregnancy questionnaire for maternal health & fitness monitoring.",
  antenatalFormSections,
  "Antenatal_Postnatal_Questionnaire_Form.pdf"
);

createPdf(
  "Weekly Check-In Form",
  "Submit your weekly progress feedback for plan adjustments by Coach Aman.",
  checkinFormSections,
  "Weekly_Checkin_Form.pdf"
);
