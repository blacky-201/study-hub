import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
 
dotenv.config();


const app = express();
// Allow frontend to talk to this server
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],

  })
);

app.use(express.json());


/*--------pdf upload-------*/

const uploadDir = path.join(process.cwd(), "uploads");


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + ".pdf";
    cb(null, uniqueName);
  }
});

const upload = multer({
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDFs allowed"));
    }
    cb(null, true);
  },
  storage
});

app.use("/uploads", express.static(uploadDir));
app.post("/api/upload-pdf", upload.single("pdf"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const pdfUrl = `http://localhost:3000/uploads/${req.file.filename}`;

    res.json({
      success: true,
      url: pdfUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF upload failed" });
  }
});



//  Gemini client initialization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// This model name will be verified by the function above when running the code.
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// CHAT API
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Message is required" });
    }

    

   const prompt = `

You are an educational AI assistant.

GLOBAL OUTPUT STYLE — MUST APPLY TO ALL RESPONSES:

Formatting:
- Never use markdown headings (##, ###).
- Never use bold (**).
- Never use numbered lists.
- Use clean line breaks for readability.
- Use the symbol ➤ for each main point.
- use the symbol • for each Subpoint.
- Put the explanation on the next line (second line rule).
- Keep spacing between points consistent.
- No emojis.

Writing style:
- Clear, simple, student-friendly language.
- Professional but human tone.
- No unnecessary introductions or conclusions.
- Avoid filler phrases and repetition.
- Use real-world analogies only when helpful.

Structure rule (default):
- If explaining a concept → start with 1–2 simple definition lines.
- Then break the explanation into ➤ points.
- Each ➤ point must have:
  • Title on first line  
  • Explanation on second line  

Strict rule:
- If any rule is violated, regenerate the response until all rules are followed.


${message}
`;

const result = await model.generateContent(prompt);


    // Access 'text()' from 'result.response'
    const reply = result.response.text();

    if (!reply) {
      throw new Error("Empty response from Gemini");
    }

    res.json({ reply });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({
      reply: "❌ Gemini AI error: " + error.message,
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});