module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' });

  const prompt = `You are a clinical nutritionist. Identify every food item visible in this meal photo.
Return ONLY valid JSON, no markdown, no extra text:
{
  "meal_name": "meal name in Hebrew",
  "ingredients": [
    { "name_en": "ingredient name in English for USDA search", "name_he": "שם בעברית", "amount": "estimated amount e.g. 150 גרם" }
  ]
}
Be specific with amounts based on what you see. Identify each component separately.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
            { text: prompt }
          ]}],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      }
    );
    const data = await geminiRes.json();
    if (!geminiRes.ok) return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini error', quota_exceeded: geminiRes.status === 429 });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json({ ok: true, result: parsed });
    } catch {
      return res.status(200).json({ ok: false, error: 'Could not parse response' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};
