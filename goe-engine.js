// ═══════════════════════════════════════════════════════════════
// GOE LIVE INTELLIGENCE ENGINE
// All data is fetched LIVE from the GOE server (localhost:3001)
// which scrapes real Indian news RSS feeds and processes them via NLP.
// ═══════════════════════════════════════════════════════════════

const GOE_SERVER = 'http://localhost:3001';

// ─── Server connectivity check ─────────────────────────────────
async function checkServer() {
  try {
    const res = await fetch(`${GOE_SERVER}/api/status`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}

// ─── Fetch full intelligence pipeline from server ───────────────
async function fetchLiveIntelligence() {
  const res = await fetch(`${GOE_SERVER}/api/intelligence`);
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

// ─── Fetch live forex rates ─────────────────────────────────────
async function fetchLiveForex() {
  try {
    const res = await fetch(`${GOE_SERVER}/api/forex`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// ─── Fetch live GDP data ────────────────────────────────────────
async function fetchLiveGDP() {
  try {
    const res = await fetch(`${GOE_SERVER}/api/gdp`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// ─── Fetch domain impact scoring ────────────────────────────────
async function fetchDomainImpact() {
  try {
    const res = await fetch(`${GOE_SERVER}/api/domain-impact`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// ─── Fetch causal chains ────────────────────────────────────────
async function fetchCausalChains() {
  try {
    const res = await fetch(`${GOE_SERVER}/api/causal-chains`);
    return res.ok ? res.json() : [];
  } catch { return []; }
}

// ─── Fetch world impact (country intensity) ─────────────────────
async function fetchWorldImpact() {
  try {
    const res = await fetch(`${GOE_SERVER}/api/world-impact`);
    return res.ok ? res.json() : [];
  } catch { return []; }
}

// ─── Fetch entity mention trends ────────────────────────────────
async function fetchEntityTrends() {
  try {
    const res = await fetch(`${GOE_SERVER}/api/entity-trends`);
    return res.ok ? res.json() : [];
  } catch { return []; }
}


// ─── Build knowledge graph from live articles ───────────────────
function buildGraphFromArticles(articles, graph) {
  let newEntities = 0, newEdges = 0;
  articles.forEach(article => {
    if (!article.entities?.length) return;
    article.entities.forEach(entity => {
      const id = entity.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      graph.addEntity({
        id,
        label: entity.name,
        type: entity.type || 'concept',
        domain: entity.domain || article.domain || 'geopolitics',
        confidence: Math.min(95, 45 + Math.round((article.sentiment || 50) / 5)),
        metadata: {
          threatLevel: article.threatLevel,
          insight: article.insight,
          source: article.source,
          publishedAt: article.publishedAt,
          link: article.link
        }
      });
      newEntities++;
    });
    (article.relationships || []).forEach(rel => {
      const srcId = rel.source.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const tgtId = rel.target.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (graph.nodes.has(srcId) && graph.nodes.has(tgtId)) {
        graph.addRelationship(srcId, tgtId, rel.relationship, rel.confidence || 50);
        newEdges++;
      }
    });
  });
  addLog('RELATIONSHIP', `Built graph: +${newEntities} entities, +${newEdges} relationships`);
  return { newEntities, newEdges };
}

// ─── Ticker: populated from live server ticker items ────────────
function updateTickerFromLive(tickerItems) {
  const tc = document.getElementById('tickerContent');
  if (!tc || !tickerItems?.length) return;
  tc.innerHTML = tickerItems.map(item =>
    `<span class="ticker-item">
      <span class="dot" style="background:${domainColor(item.domain)}"></span>
      ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${item.text}</a>` : item.text}
      <span style="font-size:9px;color:var(--text3);margin-left:6px">${item.source || ''}</span>
    </span>`
  ).join('');
}

// ═══════════════ STRATEGY VIEW ═══════════════
function renderStrategy(mc) {
  mc.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px;margin-bottom:16px">STRATEGIC ADVISOR</h2>
    <div class="card" style="margin-bottom:16px" data-rich-tip="strategy-query">
      <textarea class="textarea" id="strategyInput" placeholder="Ask anything about global strategy, India's position, threat analysis, or run a what-if scenario..." style="min-height:80px"
        data-tip="Type any strategic question. The AI will use the live knowledge graph (${GOEState.graph?.nodes.size || 0} entities) to generate intelligence-grade analysis."></textarea>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="submitStrategy()"
                data-tip="Submit your query to the Strategic Advisor. Uses the live knowledge graph + Claude AI.">🔍 Analyze</button>
        <button class="btn btn-outline btn-sm" onclick="quickQuery('What are the top 3 threats to India right now?')"
                data-tip="Pre-built query: Get an AI assessment of India's top 3 active threats based on the current intelligence graph.">India threat assessment</button>
        <button class="btn btn-outline btn-sm" onclick="quickQuery('What are India\\'s top 3 strategic vulnerabilities?')"
                data-tip="Pre-built query: Identify the 3 most critical structural vulnerabilities in India's strategic posture.">Top 3 vulnerabilities</button>
        <button class="btn btn-outline btn-sm" onclick="quickQuery('Analyze the current Indo-Pacific strategic situation')"
                data-tip="Pre-built query: Current Indo-Pacific power balance, key risks, and India's positioning within it.">Indo-Pacific situation</button>
        <button class="btn btn-outline btn-sm" onclick="quickQuery('What is China\\'s current strategic posture towards India?')"
                data-tip="Pre-built query: AI assessment of China's military, economic, and diplomatic posture towards India.">China posture analysis</button>
        <button class="btn btn-outline btn-sm" onclick="quickQuery('What economic opportunities should India pursue globally?')"
                data-tip="Pre-built query: Key economic opportunities India should prioritise based on current global intelligence.">Economic opportunities</button>
        <button class="btn btn-outline btn-sm" onclick="runWhatIf()"
                data-rich-tip="what-if-scenario">🔮 Run what-if scenario</button>
      </div>
    </div>
    <div id="strategyResult"></div>
    <div id="strategyHistory" style="margin-top:20px">
      ${GOEState.queryHistory.slice(0, 5).map((q) => `
        <div class="card" style="margin-bottom:8px;cursor:pointer" onclick="this.querySelector('.qh-body').style.display=this.querySelector('.qh-body').style.display==='none'?'block':'none'"
             data-tip="Previous query: click to expand/collapse the response.">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;font-weight:600">${q.query.slice(0, 80)}${q.query.length > 80 ? '...' : ''}</span>
            <span class="badge badge-medium" data-tip="AI confidence in this response (0–100%). Below 60 = limited data in graph. Above 80 = well-evidenced.">conf: ${q.confidence}%</span>
          </div>
          <div class="qh-body" style="display:none;margin-top:12px;font-size:13px;color:var(--text2);line-height:1.6;white-space:pre-wrap">${q.response?.slice(0, 500) || ''}</div>
        </div>`).join('')}
    </div>`;
  setTimeout(() => { if (typeof attachTooltips === 'function') attachTooltips(); }, 50);
}

function quickQuery(q) {
  document.getElementById('strategyInput').value = q;
  submitStrategy();
}

async function submitStrategy() {
  const input = document.getElementById('strategyInput');
  const result = document.getElementById('strategyResult');
  const query = input.value.trim();
  if (!query) return;
  result.innerHTML = `<div class="card"><div style="display:flex;align-items:center;gap:10px;padding:20px"><div class="spinner"></div><span style="color:var(--accent);font-family:var(--font-mono);font-size:13px">Reasoning over ${GOEState.graph?.nodes.size || 0} entities...</span></div></div>`;

  const res = await Reasoner.queryStrategy(query, GOEState.graph);
  GOEState.queryHistory.unshift({ query, response: res.response, confidence: res.confidence, time: new Date() });
  if (GOEState.queryHistory.length > 10) GOEState.queryHistory.pop();

  result.innerHTML = `
    <div class="card" style="animation:fadeIn .4s ease">
      <div class="card-title">Intelligence Response</div>
      <div style="font-size:14px;line-height:1.7;color:var(--text);white-space:pre-wrap;margin-bottom:16px">${res.response}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <span class="badge badge-medium">Confidence: ${res.confidence}%</span>
        <span class="badge badge-low">${new Date().toLocaleTimeString()}</span>
      </div>
      ${res.entitiesConsulted?.length ? `<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-family:var(--font-display);letter-spacing:1px">ENTITIES CONSULTED</div><div style="display:flex;flex-wrap:wrap;gap:4px">${res.entitiesConsulted.map(e => `<span class="badge badge-low">${e}</span>`).join('')}</div></div>` : ''}
      ${res.actions?.length ? `<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-family:var(--font-display);letter-spacing:1px">RECOMMENDED ACTIONS</div>${res.actions.map(a => `<div style="font-size:13px;color:var(--text2);padding:4px 0;border-bottom:1px solid var(--border)">→ ${a}</div>`).join('')}</div>` : ''}
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-sm btn-outline" onclick="exportBrief()">📥 Export as Brief</button>
      </div>
    </div>`;
}

async function runWhatIf() {
  const input = document.getElementById('strategyInput');
  const result = document.getElementById('strategyResult');
  const hypothesis = input.value.trim() || 'What if China imposes a naval blockade in the South China Sea?';
  input.value = hypothesis;
  result.innerHTML = `<div class="card"><div style="display:flex;align-items:center;gap:10px;padding:20px"><div class="spinner"></div><span style="color:var(--accent);font-family:var(--font-mono);font-size:13px">Running scenario analysis...</span></div></div>`;

  const res = await Reasoner.runScenario(hypothesis, GOEState.graph);
  result.innerHTML = `
    <div class="card" style="animation:fadeIn .4s ease">
      <div class="card-title">Scenario Analysis: ${hypothesis.slice(0, 60)}...</div>
      <div style="display:flex;gap:20px;margin-bottom:16px;flex-wrap:wrap">
        <div style="text-align:center"><div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--warn)">${res.probability}%</div><div style="font-size:10px;color:var(--text3)">PROBABILITY</div></div>
        <div style="text-align:center"><div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--accent)">${res.confidence}%</div><div style="font-size:10px;color:var(--text3)">CONFIDENCE</div></div>
      </div>
      <div style="font-size:14px;line-height:1.7;color:var(--text);white-space:pre-wrap;margin-bottom:16px">${res.analysis}</div>
      ${res.outcomes?.length ? `<div style="margin-bottom:16px"><div style="font-size:11px;color:var(--text3);margin-bottom:8px;font-family:var(--font-display);letter-spacing:1px">POSSIBLE OUTCOMES</div>
        ${res.outcomes.map(o => `<div style="padding:10px;margin-bottom:8px;background:var(--surface2);border-radius:8px;border-left:3px solid ${o.scenario === 'Best case' ? 'var(--success)' : o.scenario === 'Worst case' ? 'var(--danger)' : 'var(--warn)'}">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-weight:600;font-size:13px">${o.scenario}</span><span class="badge badge-medium">${o.probability}%</span></div>
          <div style="font-size:12px;color:var(--text2)">${o.description}</div>
        </div>`).join('')}</div>` : ''}
      ${res.indiaImpact ? `<div class="card" style="background:rgba(0,229,204,.05);border-color:rgba(0,229,204,.2)"><div class="card-title" style="color:var(--accent)">Impact on India</div><div style="font-size:13px;color:var(--text2);line-height:1.6">${res.indiaImpact}</div></div>` : ''}
    </div>`;
}

function exportBrief() {
  const last = GOEState.queryHistory[0];
  if (!last) return;
  const text = `STRATEGIC INTELLIGENCE BRIEF\nGlobal Ontology Engine — ${new Date().toISOString()}\n\nQUERY: ${last.query}\n\n${last.response}\n\nConfidence: ${last.confidence}%\nGenerated: ${new Date().toLocaleString()}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `goe_brief_${Date.now()}.txt`; a.click();
}

// ═══════════════ LIVE FEED VIEW ═══════════════
function renderLiveFeed(mc) {
  const LOG_COLORS = {
    NEW_ENTITY: '#00E5CC', RELATIONSHIP: '#4E9AF1', THREAT_DETECTED: '#FF3B5C',
    CONTRADICTION: '#F5A623', CONFIDENCE_UPDATE: '#8B90A0', SOURCE_SYNCED: '#00D084'
  };
  mc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px">LIVE UPDATE LOG</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${Object.keys(LOG_COLORS).map(t => `<button class="btn btn-sm btn-outline log-filter" style="font-size:9px;border-color:${LOG_COLORS[t]}40;color:${LOG_COLORS[t]}" onclick="filterLog('${t}',this)">${t.replace(/_/g, ' ')}</button>`).join('')}
        <button class="btn btn-sm btn-outline" onclick="renderLiveFeed(document.getElementById('mainContent'))">All</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 300px;gap:16px">
      <div class="card" id="logContainer" style="max-height:calc(100vh - 220px);overflow-y:auto">
        ${GOEState.updateLog.length === 0
      ? '<div style="color:var(--text3);text-align:center;padding:40px">Waiting for events...</div>'
      : GOEState.updateLog.map(entry => `
              <div class="log-entry">
                <span class="log-time">${formatTime(entry.time)}</span>
                <span class="log-type" style="background:${LOG_COLORS[entry.type] || '#8B90A0'}20;color:${LOG_COLORS[entry.type] || '#8B90A0'}">${entry.type}</span>
                <span class="log-msg">${entry.msg}</span>
              </div>`).join('')}
      </div>
      <div>
        <div class="card" style="margin-bottom:12px">
          <div class="card-title">Graph Activity</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--text2)">Total Entities</span><span style="font-family:var(--font-mono);color:var(--accent)">${GOEState.graph?.nodes.size || 0}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--text2)">Relationships</span><span style="font-family:var(--font-mono);color:var(--accent)">${GOEState.graph?.edges.size || 0}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--text2)">Active Threats</span><span style="font-family:var(--font-mono);color:var(--danger)">${GOEState.threats.length}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--text2)">Claude Calls</span><span style="font-family:var(--font-mono);color:var(--warn)">${GOEState.claudeCallCount}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--text2)">Last Sync</span><span style="font-family:var(--font-mono);font-size:11px;color:var(--text3)">${timeAgo(GOEState.lastSync)}</span></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Log Stats</div>
          ${Object.keys(LOG_COLORS).map(t => {
    const count = GOEState.updateLog.filter(e => e.type === t).length;
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
                <div style="width:8px;height:8px;border-radius:50%;background:${LOG_COLORS[t]}"></div>
                <span style="font-size:11px;color:var(--text2);flex:1">${t.replace(/_/g, ' ')}</span>
                <span style="font-family:var(--font-mono);font-size:11px;color:${LOG_COLORS[t]}">${count}</span>
              </div>`;
  }).join('')}
        </div>
      </div>
    </div>`;
}

function filterLog(type, btn) {
  const container = document.getElementById('logContainer');
  if (!container) return;
  const LOG_COLORS = { NEW_ENTITY: '#00E5CC', RELATIONSHIP: '#4E9AF1', THREAT_DETECTED: '#FF3B5C', CONTRADICTION: '#F5A623', CONFIDENCE_UPDATE: '#8B90A0', SOURCE_SYNCED: '#00D084' };
  const filtered = GOEState.updateLog.filter(e => e.type === type);
  container.innerHTML = filtered.length === 0
    ? `<div style="color:var(--text3);text-align:center;padding:20px">No ${type} events yet</div>`
    : filtered.map(entry => `
            <div class="log-entry">
              <span class="log-time">${formatTime(entry.time)}</span>
              <span class="log-type" style="background:${LOG_COLORS[entry.type] || '#8B90A0'}20;color:${LOG_COLORS[entry.type] || '#8B90A0'}">${entry.type}</span>
              <span class="log-msg">${entry.msg}</span>
            </div>`).join('');
}

// ═══════════════ SETTINGS VIEW ═══════════════
function renderSettings(mc) {
  mc.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px;margin-bottom:16px">SETTINGS & CONFIGURATION</h2>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Data Sources Status</div>
        ${GOEState.sources.map(s => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="width:8px;height:8px;border-radius:50%;background:${s.status === 'ok' ? 'var(--success)' : s.status === 'error' ? 'var(--danger)' : 'var(--text3)'}${s.status !== 'error' ? ';animation:pulse 2s infinite' : ''}"></div>
            <span style="font-size:13px;flex:1">${s.name}</span>
            <span style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">${s.lastFetch ? timeAgo(s.lastFetch) : 'never'}</span>
            <span class="badge ${s.status === 'ok' ? 'badge-low' : s.status === 'error' ? 'badge-critical' : 'badge-medium'}">${s.status}</span>
          </div>`).join('')}
      </div>
      <div>
        <div class="card" style="margin-bottom:12px">
          <div class="card-title">System Configuration</div>
          <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px">Refresh Interval</span>
            <div style="display:flex;align-items:center;gap:8px">
              <input type="range" min="30" max="300" step="30" value="${GOEState.refreshInterval}" id="refreshSlider"
                onchange="GOEState.refreshInterval=+this.value;document.getElementById('refreshVal').textContent=this.value+'s'"
                style="width:120px;accent-color:var(--accent)">
              <span id="refreshVal" style="font-family:var(--font-mono);font-size:12px;color:var(--accent);width:40px">${GOEState.refreshInterval}s</span>
            </div>
          </div>
          <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
            <span style="font-size:13px">Claude API Calls</span>
            <span style="font-family:var(--font-mono);font-size:13px;color:var(--accent)">${GOEState.claudeCallCount}</span>
          </div>
          <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
            <span style="font-size:13px">Graph Nodes</span>
            <span style="font-family:var(--font-mono);font-size:13px">${GOEState.graph?.nodes.size || 0}</span>
          </div>
          <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
            <span style="font-size:13px">Graph Edges</span>
            <span style="font-family:var(--font-mono);font-size:13px">${GOEState.graph?.edges.size || 0}</span>
          </div>
          <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
            <span style="font-size:13px">Active Threats</span>
            <span style="font-family:var(--font-mono);font-size:13px;color:var(--danger)">${GOEState.threats.length}</span>
          </div>
          <div style="padding:8px 0;display:flex;justify-content:space-between">
            <span style="font-size:13px">India Score</span>
            <span style="font-family:var(--font-mono);font-size:13px;color:var(--success)">${GOEState.indiaScore.overall || 0}/100</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Actions</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-outline" onclick="pruneGraph()">🧹 Prune Stale Nodes</button>
            <button class="btn btn-outline" onclick="exportGraph()">📥 Export Graph as JSON</button>
            <button class="btn btn-outline" onclick="manualRefresh()">🔄 Force Refresh Cycle</button>
            <button class="btn btn-danger" onclick="resetGOE()">🗑 Reset & Clear All Data</button>
          </div>
        </div>
      </div>
    </div>`;
}

function pruneGraph() {
  const count = GOEState.graph?.pruneStale() || 0;
  addLog('CONFIDENCE_UPDATE', `Pruned ${count} stale nodes from graph`);
  renderView('settings');
}

function exportGraph() {
  if (!GOEState.graph) return;
  const json = GOEState.graph.serialize();
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `goe_graph_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

function manualRefresh() {
  addLog('SOURCE_SYNCED', 'Manual refresh triggered by user');
  UpdateOrchestrator.runCycle();
}

// ═══════════════ DARK MODE / NIGHT OPS ═══════════════
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('goe_theme', newTheme);
  
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.innerHTML = isDark ? '🌙 NIGHT OPS' : '☀️ DAY MODE';
  
  // Re-render current view to update any inline colour references
  renderView(GOEState.currentView);
  addLog('SOURCE_SYNCED', `Theme switched to ${newTheme.toUpperCase()} mode`);
}

function initTheme() {
  const saved = localStorage.getItem('goe_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = '☀️ DAY MODE';
  }
}


function resetGOE() {
  if (!confirm('Reset all GOE data? This will clear the knowledge graph, threats, and all analysis.')) return;
  localStorage.clear();
  location.reload();
}

// ═══════════════════════════════════════════════
// UPDATE ORCHESTRATOR — Live Server Polling
// ═══════════════════════════════════════════════
const UpdateOrchestrator = {
  interval: null,
  async runCycle() {
    addLog('SOURCE_SYNCED', 'Fetching live intelligence from server...');
    try {
      const intel = await fetchLiveIntelligence();

      // Rebuild graph from fresh articles
      buildGraphFromArticles(intel.articles || [], GOEState.graph);

      // Update economic stats from forex
      const forex = await fetchLiveForex();
      if (forex?.rates?.INR) {
        GOEState._exchangeRate = forex.rates.INR.toFixed(2);
        const el = document.getElementById('statExchange');
        if (el) el.textContent = `₹${GOEState._exchangeRate}`;
      }

      // Refresh threats
      if (intel.threats?.length) {
        GOEState.threats = intel.threats.map((t, i) => ({ ...t, id: `threat_${Date.now()}_${i}`, detected: new Date().toISOString(), status: 'active' }));
        GOEState.emit('threats-updated', GOEState.threats);
        addLog('THREAT_DETECTED', `${GOEState.threats.length} threats from live news`);
      }

      // Refresh scores
      if (intel.indiaScore?.overall) {
        GOEState.indiaScore = intel.indiaScore;
        GOEState.emit('score-updated', GOEState.indiaScore);
      }

      // Refresh ticker from live headlines
      if (intel.tickerItems?.length) {
        GOEState.tickerItems = intel.tickerItems;
        updateTickerFromLive(intel.tickerItems);
      }

      // Refresh enhanced pipeline data
      const [di, cc, wi, et] = await Promise.all([
        fetchDomainImpact(), fetchCausalChains(), fetchWorldImpact(), fetchEntityTrends()
      ]);
      if (di) GOEState.domainImpact = di;
      if (cc?.length) GOEState.causalChains = cc;
      if (wi?.length) GOEState.worldImpact = wi;
      if (et?.length) GOEState.entityTrends = et;

      GOEState.graph.decayConfidence();
      try { localStorage.setItem('goe_graph', GOEState.graph.serialize()); } catch (e) { }
      updateTopbar();
      renderView(GOEState.currentView);
      addLog('SOURCE_SYNCED', `Cycle done: ${GOEState.graph.nodes.size} nodes, ${GOEState.graph.edges.size} edges — ${intel.totalArticles} live articles`);
    } catch (e) {
      console.error('Update cycle error:', e);
      addLog('CONTRADICTION', `Update error: ${e.message}`);
      // Show non-intrusive error banner if server goes offline mid-session
      if (!document.getElementById('serverErrorBanner')) {
        const banner = document.createElement('div');
        banner.id = 'serverErrorBanner';
        banner.innerHTML = `
          <div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#7f1d1d;color:#fecaca;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-family:var(--font-mono)">
            <span>⚠ INTELLIGENCE SERVER DISCONNECTED — Live pipeline paused. Ensure <code style="background:#450a0a;padding:2px 6px;border-radius:4px;color:#fca5a5">node server.js</code> is running on port 3001.</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:1px solid #fca5a5;color:#fca5a5;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px">DISMISS</button>
          </div>`;
        document.body.appendChild(banner);
      }
    }
  },
  start() {
    this.interval = setInterval(() => this.runCycle(), GOEState.refreshInterval * 1000);
  },
  stop() { if (this.interval) clearInterval(this.interval); }
};

function updateTopbar() {
  const g = GOEState.graph;
  const ne = document.getElementById('statNodes'); if (ne) ne.textContent = g ? g.nodes.size : 0;
  const ee = document.getElementById('statEdges'); if (ee) ee.textContent = g ? g.edges.size : 0;
  const se = document.getElementById('statSources'); if (se) se.textContent = GOEState.sources.filter(s => s.status === 'ok').length;
  const sy = document.getElementById('statSync'); if (sy) sy.textContent = timeAgo(GOEState.lastSync);
  const ac = document.getElementById('alertCount'); if (ac) ac.textContent = GOEState.threats.length;
}

function updateTicker() {
  const tc = document.getElementById('tickerContent');
  if (!tc) return;
  const items = GOEState.tickerItems.slice(-30);
  if (!items.length) {
    tc.innerHTML = '<span class="ticker-item" style="color:var(--text3)">⟳ Fetching live headlines...</span>';
    return;
  }
  tc.innerHTML = items.map(item =>
    `<span class="ticker-item">
      <span class="dot" style="background:${domainColor(item.domain || 'geopolitics')}"></span>
      ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${item.text}</a>` : item.text}
      ${item.source ? `<span style="font-size:9px;color:var(--text3);margin-left:6px">[${item.source}]</span>` : ''}
    </span>`
  ).join('');
}

// ═══════════════════════════════════════════════
// STARTUP SEQUENCE
// ═══════════════════════════════════════════════
async function startupSequence() {
  initTheme(); // Restore saved dark/light theme immediately
  const steps = document.querySelectorAll('.startup-step');
  const bar = document.getElementById('startupBarFill');
  const total = steps.length;

  function markStep(idx, status) {
    if (idx >= total) return;
    steps.forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i < idx) s.classList.add('done');
    });
    if (idx < total) {
      const s = steps[idx];
      s.classList.add(status === 'done' ? 'done' : 'active');
      s.querySelector('.step-icon').textContent = status === 'done' ? '✓' : '◉';
    }
    bar.style.width = ((idx + 1) / total * 100) + '%';
  }

  // STEP 0: Render UI shell
  markStep(0, 'active');
  await sleep(200);
  markStep(0, 'done');

  // STEP 1: Initialize knowledge graph
  markStep(1, 'active');
  GOEState.graph = new KnowledgeGraph();
  const saved = localStorage.getItem('goe_graph');
  if (saved) {
    GOEState.graph.deserialize(saved);
    addLog('NEW_ENTITY', `Restored ${GOEState.graph.nodes.size} cached entities`);
  }
  await sleep(200);
  markStep(1, 'done');

  // STEP 2: Check server + fetch live intelligence
  markStep(2, 'active');
  const serverUp = await checkServer();
  if (!serverUp) {
    document.getElementById('startupOverlay').innerHTML = `
      <div style="text-align:center;padding:40px;max-width:480px;margin:0 auto">
        <div style="font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--accent);letter-spacing:4px;margin-bottom:16px">G.O.E.</div>
        <div style="font-family:var(--font-display);font-size:14px;color:var(--danger);letter-spacing:2px;margin-bottom:12px">⚠ INTELLIGENCE SERVER OFFLINE</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:24px">
          The GOE backend server is not running.<br>
          Open a terminal in the project folder and run:<br>
          <code style="background:var(--surface3);padding:8px 14px;border-radius:6px;display:inline-block;margin-top:10px;font-family:var(--font-mono);color:var(--accent)">npm install &amp;&amp; node server.js</code>
        </div>
        <button class="btn btn-primary" onclick="location.reload()" style="margin:0 auto">
          🔄 Retry Connection
        </button>
      </div>`;
    return;
  }
  addLog('SOURCE_SYNCED', 'GOE Intelligence Server connected');

  let intel;
  try {
    intel = await fetchLiveIntelligence();
    addLog('SOURCE_SYNCED', `Live pipeline: ${intel.totalArticles} articles from ${intel.sources?.filter(s=>s.status==='ok').length || 0} sources`);
    GOEState.sources = intel.sources || [];
    GOEState.articles = intel.articles || [];
    GOEState.lastSync = Date.now();
  } catch(e) {
    addLog('CONTRADICTION', `Intelligence fetch failed: ${e.message}`);
    intel = { articles: [], threats: [], indiaScore: {}, tickerItems: [], sources: [] };
  }

  // Live forex + GDP from server
  const [forex, gdp] = await Promise.all([fetchLiveForex(), fetchLiveGDP()]);
  if (forex?.rates?.INR) { GOEState._exchangeRate = forex.rates.INR.toFixed(2); addLog('SOURCE_SYNCED', `USD/INR: ₹${GOEState._exchangeRate}`); }
  if (gdp && Array.isArray(gdp) && gdp[1]) {
    const gdpData = gdp[1].find(d => d.value);
    if (gdpData) { GOEState._gdpValue = `$${(gdpData.value / 1e12).toFixed(2)}T`; addLog('SOURCE_SYNCED', `India GDP: ${GOEState._gdpValue}`); }
  }

  // Fetch enhanced pipeline data from new endpoints
  const [domainImpact, causalChains, worldImpact, entityTrends] = await Promise.all([
    fetchDomainImpact(), fetchCausalChains(), fetchWorldImpact(), fetchEntityTrends()
  ]);
  if (domainImpact) { GOEState.domainImpact = domainImpact; addLog('SOURCE_SYNCED', 'Domain impact scores loaded'); }
  if (causalChains?.length) { GOEState.causalChains = causalChains; addLog('RELATIONSHIP', `${causalChains.length} causal chains detected`); }
  if (worldImpact?.length) { GOEState.worldImpact = worldImpact; addLog('SOURCE_SYNCED', `World impact: ${worldImpact.length} countries tracked`); }
  if (entityTrends?.length) { GOEState.entityTrends = entityTrends; }
  markStep(2, 'done');

  // STEP 3: Build entities from live NLP results
  markStep(3, 'active');

  // Structural anchor entities (real intelligence data comes from news NLP)
  const seedEntities = [
    { id: 'india', label: 'India', type: 'nation', domain: 'geopolitics', confidence: 95 },
    { id: 'china', label: 'China', type: 'nation', domain: 'geopolitics', confidence: 85 },
    { id: 'united_states', label: 'United States', type: 'nation', domain: 'geopolitics', confidence: 88 },
    { id: 'russia', label: 'Russia', type: 'nation', domain: 'geopolitics', confidence: 78 },
    { id: 'pakistan', label: 'Pakistan', type: 'nation', domain: 'defense', confidence: 72 },
    { id: 'japan', label: 'Japan', type: 'nation', domain: 'economics', confidence: 70 },
    { id: 'israel', label: 'Israel', type: 'nation', domain: 'defense', confidence: 65 },
    { id: 'uae', label: 'UAE', type: 'nation', domain: 'economics', confidence: 68 },
    { id: 'australia', label: 'Australia', type: 'nation', domain: 'geopolitics', confidence: 67 },
    { id: 'saudi_arabia', label: 'Saudi Arabia', type: 'nation', domain: 'economics', confidence: 66 },
    { id: 'quad', label: 'QUAD Alliance', type: 'organization', domain: 'geopolitics', confidence: 78 },
    { id: 'brics', label: 'BRICS', type: 'organization', domain: 'economics', confidence: 72 },
    { id: 'nato', label: 'NATO', type: 'organization', domain: 'defense', confidence: 75 },
    { id: 'un_security_council', label: 'UN Security Council', type: 'organization', domain: 'geopolitics', confidence: 70 },
    { id: 'indian_military', label: 'Indian Armed Forces', type: 'organization', domain: 'defense', confidence: 85 },
    { id: 'isro', label: 'ISRO', type: 'organization', domain: 'technology', confidence: 80 },
    { id: 'drdo', label: 'DRDO', type: 'organization', domain: 'defense', confidence: 72 },
    { id: 'isi', label: 'Pakistan ISI', type: 'organization', domain: 'defense', confidence: 68 },
    { id: 'pla', label: 'PLA China', type: 'organization', domain: 'defense', confidence: 75 },
    { id: 'lac', label: 'Line of Actual Control', type: 'place', domain: 'defense', confidence: 88 },
    { id: 'loc', label: 'Line of Control', type: 'place', domain: 'defense', confidence: 80 },
    { id: 'indo_pacific', label: 'Indo-Pacific', type: 'place', domain: 'geopolitics', confidence: 82 },
    { id: 'south_china_sea', label: 'South China Sea', type: 'place', domain: 'geopolitics', confidence: 70 },
    { id: 'kashmir', label: 'Kashmir', type: 'place', domain: 'defense', confidence: 78 },
    { id: 'india_gdp', label: 'India GDP', type: 'concept', domain: 'economics', confidence: 90 },
    { id: 'usd_inr_rate', label: 'USD/INR Exchange', type: 'concept', domain: 'economics', confidence: 88 },
    { id: 'bri', label: 'Belt & Road Initiative', type: 'concept', domain: 'geopolitics', confidence: 75 },
    { id: 'artificial_intelligence', label: 'Artificial Intelligence', type: 'concept', domain: 'technology', confidence: 78 },
    { id: 'climate_change', label: 'Climate Change', type: 'concept', domain: 'climate', confidence: 65 },
    { id: 'cyber_warfare', label: 'Cyber Warfare', type: 'event', domain: 'technology', confidence: 70 },
    { id: 'chandrayaan', label: 'Chandrayaan-3', type: 'event', domain: 'technology', confidence: 85 },
    { id: 'g20_presidency', label: 'G20 India Presidency', type: 'event', domain: 'geopolitics', confidence: 82 }
  ];
  seedEntities.forEach(e => GOEState.graph.addEntity(e));

  const seedRels = [
    ['india', 'china', 'border_dispute', 85], ['india', 'united_states', 'strategic_partner', 82],
    ['india', 'russia', 'defense_supplier_partner', 75], ['india', 'japan', 'quad_ally', 78],
    ['india', 'australia', 'quad_ally', 72], ['india', 'pakistan', 'adversarial', 80],
    ['india', 'quad', 'founding_member', 90], ['india', 'brics', 'founding_member', 82],
    ['india', 'indian_military', 'commands', 95], ['india', 'isro', 'operates', 90],
    ['india', 'drdo', 'funds', 88], ['india', 'g20_presidency', 'hosted', 92],
    ['india', 'indo_pacific', 'key_stakeholder', 85], ['india', 'lac', 'contested_territory', 88],
    ['china', 'pla', 'commands', 90], ['china', 'bri', 'architect', 88],
    ['china', 'south_china_sea', 'disputes', 78], ['china', 'nato', 'adversary', 60],
    ['pakistan', 'isi', 'controlled_by', 85], ['pakistan', 'loc', 'disputes_along', 80],
    ['pakistan', 'china', 'all_weather_ally', 82], ['russia', 'nato', 'adversary', 85],
    ['india', 'artificial_intelligence', 'strategic_priority', 65], ['india', 'cyber_warfare', 'targeted_by', 70],
    ['india', 'climate_change', 'vulnerable_to', 60], ['india', 'chandrayaan', 'achieved', 92],
    ['india', 'bri', 'counter_strategy', 68], ['quad', 'china', 'strategic_counter', 72],
    ['india', 'un_security_council', 'permanent_member_candidate', 70]
  ];
  seedRels.forEach(([s, t, r, c]) => GOEState.graph.addRelationship(s, t, r, c));
  addLog('NEW_ENTITY', `Seeded ${seedEntities.length} anchor entities and ${seedRels.length} relationships`);

  // Build graph from live news articles
  const { newEntities, newEdges } = buildGraphFromArticles(intel.articles || [], GOEState.graph);
  addLog('NEW_ENTITY', `Live NLP: +${newEntities} entities, +${newEdges} relationships from ${(intel.articles||[]).length} live articles`);
  markStep(3, 'done');

  // STEP 4: Build entity relationships
  markStep(4, 'active');
  await sleep(300);
  addLog('RELATIONSHIP', `Graph now has ${GOEState.graph.nodes.size} nodes and ${GOEState.graph.edges.size} edges`);
  markStep(4, 'done');

  // STEP 5: Load live threats from server NLP
  markStep(5, 'active');
  if (intel.threats?.length) {
    GOEState.threats = intel.threats.map((t, i) => ({
      ...t,
      id: `threat_${Date.now()}_${i}`,
      detected: new Date().toISOString(),
      status: 'active'
    }));
    addLog('THREAT_DETECTED', `${GOEState.threats.length} live threats detected from news NLP`);
    GOEState.emit('threats-updated', GOEState.threats);
  }
  markStep(5, 'done');

  // STEP 6: Load live India scores from server NLP
  markStep(6, 'active');
  if (intel.indiaScore?.overall) {
    GOEState.indiaScore = intel.indiaScore;
    GOEState.emit('score-updated', GOEState.indiaScore);
    addLog('CONFIDENCE_UPDATE', `India Advantage Score: ${intel.indiaScore.overall} — from ${intel.totalArticles} live articles`);
  }
  markStep(6, 'done');

  // STEP 7: Activate live feeds
  markStep(7, 'active');
  UpdateOrchestrator.start();
  updateTicker();
  try { localStorage.setItem('goe_graph', GOEState.graph.serialize()); } catch (e) { }
  await sleep(400);
  markStep(7, 'done');

  // Reveal dashboard
  await sleep(500);
  document.getElementById('startupOverlay').classList.add('hidden');
  const app = document.getElementById('app');
  app.style.transition = 'opacity .5s ease';
  app.style.opacity = '1';
  updateTopbar();
  renderView('overview');
  addLog('SOURCE_SYNCED', `GOE initialized — ${GOEState.graph.nodes.size} entities, ${GOEState.graph.edges.size} relationships, ${GOEState.threats.length} threats`);

  // Populate ticker from live server headlines
  if (intel.tickerItems?.length) {
    GOEState.tickerItems = intel.tickerItems;
    updateTickerFromLive(intel.tickerItems);
  }

  // Live sync indicator
  setInterval(() => {
    const el = document.getElementById('statSync');
    if (el) el.textContent = timeAgo(GOEState.lastSync);
  }, 5000);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  startupSequence().catch(e => {
    console.error('Startup failed:', e);
    const overlay = document.getElementById('startupOverlay');
    if (overlay) overlay.innerHTML = `
            <div style="text-align:center;padding:40px">
              <div style="font-family:var(--font-display);font-size:18px;color:var(--danger);margin-bottom:12px">Initialization Error</div>
              <div style="font-size:13px;color:var(--text2);margin-bottom:20px">${e.message}</div>
              <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>`;
  });
});
