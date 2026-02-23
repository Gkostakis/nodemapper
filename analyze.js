module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  const domain = url.replace(/^https?:\/\//, "").split("/")[0];

  const prompt = `You are a web content analysis AI. Given a website URL, generate a realistic content network analysis as if you have crawled the site.

Website URL: ${url}
Domain: ${domain}

Generate a content network with 18-26 keyword nodes and their connections. Return ONLY valid JSON — no markdown, no explanation, no code fences, just raw JSON:

{
  "domain": "${domain}",
  "title": "Site title",
  "description": "One sentence about the site",
  "nodes": [
    {
      "id": "node_1",
      "label": "keyword",
      "weight": 85,
      "category": "primary",
      "articles": [
        {"title": "Article title", "url": "${url}/article-slug"}
      ]
    }
  ],
  "edges": [
    {"source": "node_1", "target": "node_2", "weight": 0.8}
  ]
}

Rules:
- weight: 20-100 (importance score)
- category: "primary" (5-7 nodes, weight 70-100), "secondary" (8-10 nodes, weight 40-70), "tertiary" (rest, weight 20-40)
- edges: 30-50 connections, weight 0.1-1.0
- articles: 2-5 per node, realistic titles and URL slugs
- Be highly specific and realistic to ${domain}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "No valid JSON in response" });

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
