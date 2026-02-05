import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "phi",
        prompt: `
You are Shuggi, a friendly human-like female assistant.
Speak naturally, short replies, polite tone.

User: ${message}
Shuggi:
        `,
        stream: false,
      }),
    });

    const data = await response.json();

    res.json({
      reply: data.response?.trim() || "Hmm… can you say that again?",
    });
  } catch (err) {
    console.error("OLLAMA ERROR:", err);
    res.json({ reply: "Shuggi is tired 😅 Try again." });
  }
});

app.listen(5000, () => {
  console.log("🚀 Shuggi server running on http://localhost:5000");
});
