
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No API key' });
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'Missing image' });
  const prompt = `Identify every food item in this meal photo. Return ONLY valid JSON: {"meal_name":"שם בעברית","ingredients":[{"name_en":"English name","name_he":"שם בעברית","amount":"כמות"}]}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }, { text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } })
    });
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: d.error?.message, quota_exceeded: r.status === 429 });
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    try { return res.status(200).json({ ok: true, result: JSON.parse(text.replace(/```json|```/g,'').trim()) }); }
    catch { return res.status(200).json({ ok: false, error: 'Parse error' }); }
  } catch(e) { return res.status(500).json({ error: e.message }); }
};
