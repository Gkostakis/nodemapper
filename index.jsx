import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

const DISCLAIMER_KEY = "nodemapper_disclaimer_accepted";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@400;500;600;700;800&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg: #080808;
    --bg2: #0f0f0f;
    --bg3: #141414;
    --bg4: #1c1c1c;
    --border: #222;
    --border2: #2a2a2a;
    --text: #e8e8e8;
    --text2: #888;
    --text3: #444;
    --accent: #c8c8c8;
    --node-color: #2a2a2a;
    --node-hover: #3a3a3a;
    --link-color: #1e1e1e;
    --highlight: #e0e0e0;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Mono', monospace;
    height: 100vh;
    overflow: hidden;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg);
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 52px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    z-index: 100;
    flex-shrink: 0;
  }

  .logo {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 0.12em;
    color: var(--text);
    text-transform: uppercase;
  }

  .logo span {
    color: var(--text3);
  }

  .header-meta {
    font-size: 10px;
    color: var(--text3);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* URL Bar */
  .url-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    flex-shrink: 0;
  }

  .url-prefix {
    font-size: 11px;
    color: var(--text3);
    padding: 0 10px 0 0;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .url-input {
    flex: 1;
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-right: none;
    color: var(--text);
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    padding: 8px 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  .url-input::placeholder { color: var(--text3); }
  .url-input:focus { border-color: var(--text3); }

  .analyze-btn {
    background: var(--text);
    color: var(--bg);
    border: none;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 0 20px;
    height: 36px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    white-space: nowrap;
  }

  .analyze-btn:hover { background: var(--accent); }
  .analyze-btn:disabled {
    background: var(--bg4);
    color: var(--text3);
    cursor: not-allowed;
  }

  /* Main Layout */
  .main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Graph Canvas */
  .graph-area {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: var(--bg);
    background-image:
      radial-gradient(circle at 50% 50%, #0d0d0d 0%, #080808 100%);
  }

  .graph-area svg {
    width: 100%;
    height: 100%;
  }

  /* Grid overlay */
  .graph-area::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 48px 48px;
    opacity: 0.25;
    pointer-events: none;
    z-index: 0;
  }

  /* Empty state */
  .empty-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1;
    pointer-events: none;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    opacity: 0.4;
  }

  .empty-state h2 {
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--text3);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .empty-state p {
    font-size: 11px;
    color: var(--text3);
    letter-spacing: 0.04em;
    opacity: 0.6;
  }

  /* Loading */
  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    background: rgba(8,8,8,0.85);
    backdrop-filter: blur(4px);
  }

  .loading-text {
    font-size: 11px;
    color: var(--text2);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 16px;
  }

  .loading-sub {
    font-size: 10px;
    color: var(--text3);
    letter-spacing: 0.06em;
    margin-top: 6px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 1px solid var(--border2);
    border-top-color: var(--text2);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Sidebar */
  .sidebar {
    width: 280px;
    border-left: 1px solid var(--border);
    background: var(--bg2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .sidebar-header {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .sidebar-title {
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text3);
    font-family: 'Syne', sans-serif;
    font-weight: 600;
  }

  .sidebar-count {
    font-size: 10px;
    color: var(--text3);
  }

  .sidebar-body {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  .sidebar-body::-webkit-scrollbar { width: 2px; }
  .sidebar-body::-webkit-scrollbar-track { background: transparent; }
  .sidebar-body::-webkit-scrollbar-thumb { background: var(--border2); }

  /* Node Detail Panel */
  .node-detail {
    padding: 20px 16px;
    border-bottom: 1px solid var(--border);
  }

  .node-detail-label {
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 6px;
    line-height: 1.2;
  }

  .node-detail-meta {
    font-size: 10px;
    color: var(--text3);
    letter-spacing: 0.06em;
    margin-bottom: 14px;
  }

  .node-connections {
    font-size: 10px;
    color: var(--text2);
    letter-spacing: 0.04em;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .connection-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  .tag {
    font-size: 9px;
    background: var(--bg4);
    border: 1px solid var(--border2);
    color: var(--text2);
    padding: 3px 7px;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tag:hover {
    border-color: var(--text3);
    color: var(--text);
  }

  /* Articles list */
  .articles-section {
    padding: 12px 16px 0;
  }

  .articles-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text3);
    margin-bottom: 10px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
  }

  .article-item {
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .article-item:hover { opacity: 0.7; }

  .article-title {
    font-size: 11px;
    color: var(--text);
    line-height: 1.5;
    margin-bottom: 3px;
  }

  .article-url {
    font-size: 9px;
    color: var(--text3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Node list */
  .node-list {
    padding: 8px 0;
  }

  .node-list-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    cursor: pointer;
    transition: background 0.15s;
    border-bottom: 1px solid transparent;
  }

  .node-list-item:hover { background: var(--bg3); }
  .node-list-item.active { background: var(--bg3); border-bottom-color: var(--border); }

  .node-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text3);
    flex-shrink: 0;
  }

  .node-list-label {
    font-size: 11px;
    color: var(--text2);
    flex: 1;
  }

  .node-list-weight {
    font-size: 9px;
    color: var(--text3);
    font-variant-numeric: tabular-nums;
  }

  /* Stats bar */
  .stats-bar {
    border-top: 1px solid var(--border);
    padding: 10px 16px;
    display: flex;
    gap: 20px;
    background: var(--bg);
    flex-shrink: 0;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-value {
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }

  .stat-label {
    font-size: 9px;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* Bottom controls */
  .controls {
    position: absolute;
    bottom: 16px;
    left: 16px;
    display: flex;
    gap: 4px;
    z-index: 5;
  }

  .ctrl-btn {
    width: 28px;
    height: 28px;
    background: var(--bg2);
    border: 1px solid var(--border2);
    color: var(--text2);
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .ctrl-btn:hover { background: var(--bg3); color: var(--text); }

  /* Domain badge */
  .domain-badge {
    position: absolute;
    top: 16px;
    left: 16px;
    background: var(--bg2);
    border: 1px solid var(--border2);
    padding: 5px 10px;
    font-size: 10px;
    color: var(--text2);
    letter-spacing: 0.05em;
    z-index: 5;
  }

  /* Disclaimer Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(8px);
  }

  .modal {
    background: var(--bg2);
    border: 1px solid var(--border2);
    max-width: 520px;
    width: 90%;
    padding: 36px;
  }

  .modal-eyebrow {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--text3);
    margin-bottom: 16px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
  }

  .modal-title {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 4px;
    line-height: 1.1;
  }

  .modal-subtitle {
    font-size: 11px;
    color: var(--text3);
    margin-bottom: 24px;
    letter-spacing: 0.04em;
  }

  .modal-body {
    font-size: 11px;
    color: var(--text2);
    line-height: 1.8;
    margin-bottom: 28px;
    border-left: 2px solid var(--border2);
    padding-left: 14px;
  }

  .modal-body p { margin-bottom: 10px; }
  .modal-body p:last-child { margin-bottom: 0; }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .modal-note {
    font-size: 9px;
    color: var(--text3);
    flex: 1;
    line-height: 1.5;
    letter-spacing: 0.03em;
  }

  .accept-btn {
    background: var(--text);
    color: var(--bg);
    border: none;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 10px 22px;
    cursor: pointer;
    transition: background 0.2s;
    white-space: nowrap;
  }

  .accept-btn:hover { background: #d0d0d0; }

  /* Error state */
  .error-bar {
    background: #1a0a0a;
    border-bottom: 1px solid #2a1010;
    padding: 8px 24px;
    font-size: 11px;
    color: #886666;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Tooltip */
  .graph-tooltip {
    position: absolute;
    background: var(--bg2);
    border: 1px solid var(--border2);
    padding: 6px 10px;
    font-size: 10px;
    color: var(--text);
    pointer-events: none;
    z-index: 20;
    letter-spacing: 0.04em;
    transform: translate(-50%, -120%);
    white-space: nowrap;
  }

  /* Category colors via dot */
  .dot-primary { background: #888; }
  .dot-secondary { background: #555; }
  .dot-tertiary { background: #333; }
`;

// ─── Anthropic API call ───────────────────────────────────────────────────────
async function analyzeWebsite(url) {
  const domain = url.replace(/^https?:\/\//, "").split("/")[0];

  const prompt = `You are a web content analysis AI. Given a website URL, generate a realistic content network analysis as if you have crawled the site.

Website URL: ${url}
Domain: ${domain}

Generate a content network with 18-26 keyword nodes and their connections. Return ONLY valid JSON with this exact structure:

{
  "domain": "${domain}",
  "title": "Site title here",
  "description": "One sentence about the site",
  "nodes": [
    {
      "id": "node_1",
      "label": "keyword",
      "weight": 85,
      "category": "primary",
      "articles": [
        {"title": "Article title", "url": "${url}/article-slug"},
        {"title": "Another article", "url": "${url}/another-slug"}
      ]
    }
  ],
  "edges": [
    {"source": "node_1", "target": "node_2", "weight": 0.8}
  ]
}

Rules:
- weight: 20-100 (frequency/importance score)
- category: "primary" (5-7 nodes, weight 70-100), "secondary" (8-10 nodes, weight 40-70), "tertiary" (rest, weight 20-40)
- edges: 30-50 connections, weight 0.1-1.0 (semantic relatedness)
- articles: 2-5 per node, realistic titles and URL slugs
- nodes must cover the main topics of this specific website authentically
- Make it highly specific and realistic to ${domain}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ─── D3 Network Component ──────────────────────────────────────────────────────
function NetworkGraph({ data, onNodeClick, selectedNode }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    // Scales
    const rScale = d3.scaleLinear().domain([20, 100]).range([5, 18]);
    const opacityScale = d3.scaleLinear().domain([20, 100]).range([0.4, 1]);

    const categoryColor = { primary: "#aaa", secondary: "#666", tertiary: "#333" };

    // Links
    const link = g.append("g").selectAll("line")
      .data(data.edges)
      .enter().append("line")
      .attr("stroke", "#1a1a1a")
      .attr("stroke-width", d => d.weight * 1.5)
      .attr("stroke-opacity", d => d.weight * 0.6);

    // Node groups
    const node = g.append("g").selectAll("g")
      .data(data.nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e, d) => {
          if (!e.active) simRef.current.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => {
          if (!e.active) simRef.current.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Outer ring (glow effect)
    node.append("circle")
      .attr("r", d => rScale(d.weight) + 4)
      .attr("fill", "none")
      .attr("stroke", d => categoryColor[d.category])
      .attr("stroke-opacity", d => opacityScale(d.weight) * 0.15)
      .attr("stroke-width", 1);

    // Main circle
    node.append("circle")
      .attr("r", d => rScale(d.weight))
      .attr("fill", d => categoryColor[d.category])
      .attr("fill-opacity", d => opacityScale(d.weight) * 0.25)
      .attr("stroke", d => categoryColor[d.category])
      .attr("stroke-opacity", d => opacityScale(d.weight) * 0.7)
      .attr("stroke-width", 1)
      .attr("class", "node-circle");

    // Label
    node.append("text")
      .text(d => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", d => rScale(d.weight) + 12)
      .attr("fill", d => categoryColor[d.category])
      .attr("fill-opacity", d => opacityScale(d.weight) * 0.9)
      .attr("font-family", "'DM Mono', monospace")
      .attr("font-size", d => d.category === "primary" ? "9px" : "8px")
      .attr("letter-spacing", "0.06em")
      .attr("pointer-events", "none");

    // Interactions
    node
      .on("mouseenter", (e, d) => {
        d3.select(e.currentTarget).select(".node-circle")
          .attr("stroke-opacity", 1)
          .attr("fill-opacity", 0.5);
        setTooltip({ label: d.label, weight: d.weight, x: e.clientX, y: e.clientY });
      })
      .on("mousemove", (e) => {
        setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
      })
      .on("mouseleave", (e, d) => {
        d3.select(e.currentTarget).select(".node-circle")
          .attr("stroke-opacity", opacityScale(d.weight) * 0.7)
          .attr("fill-opacity", opacityScale(d.weight) * 0.25);
        setTooltip(null);
      })
      .on("click", (e, d) => {
        e.stopPropagation();
        onNodeClick(d);
      });

    // Force simulation
    const nodeIds = new Set(data.nodes.map(n => n.id));
    const validEdges = data.edges.filter(e =>
      nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    const sim = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(validEdges)
        .id(d => d.id)
        .distance(d => 80 + (1 - d.weight) * 60)
        .strength(d => d.weight * 0.4))
      .force("charge", d3.forceManyBody()
        .strength(d => -rScale(d.weight) * 35))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => rScale(d.weight) + 20));

    simRef.current = sim;

    sim.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Highlight selected
    if (selectedNode) {
      const connectedIds = new Set(
        validEdges
          .filter(e => e.source.id === selectedNode.id || e.target.id === selectedNode.id)
          .flatMap(e => [e.source.id, e.target.id])
      );

      node.select(".node-circle")
        .attr("stroke-opacity", d =>
          d.id === selectedNode.id ? 1 :
          connectedIds.has(d.id) ? 0.6 : 0.1)
        .attr("fill-opacity", d =>
          d.id === selectedNode.id ? 0.6 :
          connectedIds.has(d.id) ? 0.3 : 0.05);

      link.attr("stroke-opacity", d =>
        (d.source.id === selectedNode.id || d.target.id === selectedNode.id)
          ? d.weight : 0.05);
    }

    // Center view button
    window._centerGraph = () => {
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(0, 0).scale(1)
      );
    };

    return () => sim.stop();
  }, [data, selectedNode]);

  return (
    <>
      <svg ref={svgRef} style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }} />
      {tooltip && (
        <div className="graph-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.label} · {tooltip.weight}
        </div>
      )}
    </>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [url, setUrl] = useState("");
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [disclaimer, setDisclaimer] = useState(true);

  const loadingMessages = [
    "Resolving DNS...",
    "Fetching page structure...",
    "Parsing article content...",
    "Extracting semantic keywords...",
    "Computing node weights...",
    "Building connection graph...",
    "Optimizing network layout...",
  ];

  const handleAnalyze = useCallback(async () => {
    if (!url.trim()) return;
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) normalizedUrl = "https://" + normalizedUrl;

    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setNetworkData(null);

    let msgIdx = 0;
    setLoadingMsg(loadingMessages[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[msgIdx]);
    }, 900);

    try {
      const data = await analyzeWebsite(normalizedUrl);
      setNetworkData(data);
    } catch (e) {
      setError("Analysis failed. Please check the URL and try again.");
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  }, [url]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAnalyze();
  };

  const sortedNodes = networkData
    ? [...networkData.nodes].sort((a, b) => b.weight - a.weight)
    : [];

  return (
    <>
      <style>{styles}</style>

      {/* Disclaimer Modal */}
      {disclaimer && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-eyebrow">Legal Notice · Research Tool</div>
            <div className="modal-title">NodeMapper</div>
            <div className="modal-subtitle">AI-Powered Content Network Visualization</div>
            <div className="modal-body">
              <p>
                This platform is designed exclusively for legitimate research, academic, and informational purposes. By proceeding, you acknowledge that any content analysis performed is governed by applicable laws and the target website's Terms of Service.
              </p>
              <p>
                Users are solely responsible for ensuring their use of this tool complies with the Computer Fraud and Abuse Act (CFAA), the EU General Data Protection Regulation (GDPR), robots.txt directives, and any other applicable regulations in their jurisdiction.
              </p>
              <p>
                NodeMapper does not store, share, or sell any crawled data. The developers assume no liability for misuse of this tool. Do not use this service to access private, restricted, or login-gated content without explicit authorization.
              </p>
            </div>
            <div className="modal-footer">
              <div className="modal-note">
                By clicking Accept, you confirm that you are 18+ years of age and agree to use this tool responsibly and lawfully.
              </div>
              <button className="accept-btn" onClick={() => setDisclaimer(false)}>
                Accept & Enter
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="app">
        {/* Header */}
        <div className="header">
          <div className="logo">Node<span>·</span>Mapper</div>
          <div className="header-meta">Content Intelligence Network · v1.0</div>
        </div>

        {/* URL Bar */}
        <div className="url-bar">
          <div className="url-prefix">Target ↗</div>
          <input
            className="url-input"
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
          >
            Create Content Network
          </button>
        </div>

        {error && (
          <div className="error-bar">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Main */}
        <div className="main">
          {/* Graph */}
          <div className="graph-area" onClick={() => setSelectedNode(null)}>
            {!networkData && !loading && (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="8" cy="8" r="3" stroke="#333" strokeWidth="1"/>
                    <circle cx="20" cy="8" r="3" stroke="#333" strokeWidth="1"/>
                    <circle cx="14" cy="20" r="3" stroke="#333" strokeWidth="1"/>
                    <line x1="11" y1="8" x2="17" y2="8" stroke="#2a2a2a" strokeWidth="1"/>
                    <line x1="9.5" y1="10.5" x2="12.5" y2="17.5" stroke="#2a2a2a" strokeWidth="1"/>
                    <line x1="18.5" y1="10.5" x2="15.5" y2="17.5" stroke="#2a2a2a" strokeWidth="1"/>
                  </svg>
                </div>
                <h2>No network loaded</h2>
                <p>Enter a URL above to generate a content graph</p>
              </div>
            )}

            {loading && (
              <div className="loading-overlay">
                <div className="spinner" />
                <div className="loading-text">{loadingMsg}</div>
                <div className="loading-sub">AI is mapping your content structure</div>
              </div>
            )}

            {networkData && (
              <>
                <div className="domain-badge">{networkData.domain}</div>
                <NetworkGraph
                  data={networkData}
                  onNodeClick={setSelectedNode}
                  selectedNode={selectedNode}
                />
                <div className="controls">
                  <button className="ctrl-btn" title="Reset zoom" onClick={() => window._centerGraph?.()}>⊡</button>
                  <button className="ctrl-btn" title="Clear selection" onClick={() => setSelectedNode(null)}>✕</button>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            <div className="sidebar-header">
              <div className="sidebar-title">
                {selectedNode ? "Node Detail" : "Index"}
              </div>
              <div className="sidebar-count">
                {networkData ? `${networkData.nodes.length} nodes` : "—"}
              </div>
            </div>

            <div className="sidebar-body">
              {selectedNode ? (
                <>
                  <div className="node-detail">
                    <div className="node-detail-label">{selectedNode.label}</div>
                    <div className="node-detail-meta">
                      Relevance score: {selectedNode.weight} · {selectedNode.category}
                    </div>

                    {networkData && (() => {
                      const nodeIds = new Set(networkData.nodes.map(n => n.id));
                      const validEdges = networkData.edges.filter(e =>
                        nodeIds.has(typeof e.source === "object" ? e.source.id : e.source) &&
                        nodeIds.has(typeof e.target === "object" ? e.target.id : e.target)
                      );
                      const connected = validEdges
                        .filter(e => {
                          const src = typeof e.source === "object" ? e.source.id : e.source;
                          const tgt = typeof e.target === "object" ? e.target.id : e.target;
                          return src === selectedNode.id || tgt === selectedNode.id;
                        })
                        .map(e => {
                          const otherId = (typeof e.source === "object" ? e.source.id : e.source) === selectedNode.id
                            ? (typeof e.target === "object" ? e.target.id : e.target)
                            : (typeof e.source === "object" ? e.source.id : e.source);
                          return networkData.nodes.find(n => n.id === otherId);
                        })
                        .filter(Boolean);

                      return (
                        <>
                          <div className="node-connections">Connected nodes ({connected.length})</div>
                          <div className="connection-tags">
                            {connected.map(n => (
                              <span key={n.id} className="tag" onClick={() => setSelectedNode(n)}>
                                {n.label}
                              </span>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {selectedNode.articles?.length > 0 && (
                    <div className="articles-section">
                      <div className="articles-label">Related Content ({selectedNode.articles.length})</div>
                      {selectedNode.articles.map((a, i) => (
                        <div key={i} className="article-item" onClick={() => window.open(a.url, "_blank")}>
                          <div className="article-title">{a.title}</div>
                          <div className="article-url">{a.url}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="node-list">
                  {sortedNodes.map(n => (
                    <div
                      key={n.id}
                      className={`node-list-item ${selectedNode?.id === n.id ? "active" : ""}`}
                      onClick={() => setSelectedNode(n)}
                    >
                      <div className={`node-dot dot-${n.category}`} />
                      <div className="node-list-label">{n.label}</div>
                      <div className="node-list-weight">{n.weight}</div>
                    </div>
                  ))}
                  {!networkData && (
                    <div style={{ padding: "24px 16px", fontSize: "10px", color: "var(--text3)", lineHeight: "1.8" }}>
                      Enter a target URL and click<br />
                      "Create Content Network"<br />
                      to begin analysis.
                    </div>
                  )}
                </div>
              )}
            </div>

            {networkData && (
              <div className="stats-bar">
                <div className="stat">
                  <div className="stat-value">{networkData.nodes.length}</div>
                  <div className="stat-label">Nodes</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{networkData.edges.length}</div>
                  <div className="stat-label">Edges</div>
                </div>
                <div className="stat">
                  <div className="stat-value">
                    {networkData.nodes.filter(n => n.category === "primary").length}
                  </div>
                  <div className="stat-label">Primary</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
