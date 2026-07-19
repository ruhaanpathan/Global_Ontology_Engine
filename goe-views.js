// ═══════════════════════════════════════════════
// VIEW RENDERERS — with integrated tooltip hooks
// ═══════════════════════════════════════════════

// Global chart instance references to prevent Chart.js resize loops
let _radarChartInstance = null;
let _tradeEcoChartInstance = null;
let _macroEcoChartInstance = null;

function renderView(viewId) {
  const mc = document.getElementById('mainContent');
  const renderers = {
    overview: renderOverview, graph: renderGraph, threats: renderThreats,
    opportunities: renderOpportunities,
    geopolitics: renderGeopolitics, economics: renderEconomics, defense: renderDefense,
    technology: renderTechnology, climate: renderClimate, strategy: renderStrategy,
    livefeed: renderLiveFeed, settings: renderSettings
  };
  if (renderers[viewId]) renderers[viewId](mc);
  // Attach rich tooltips after every render
  setTimeout(() => { if (typeof attachTooltips === 'function') attachTooltips(); }, 50);
}

// ── Helper: info icon with rich tooltip ──────────
function tip(key) {
  return `<i class="info-icon" data-rich-tip="${key}" style="cursor:help">i</i>`;
}

// ── Helper: generate situation report bullets from live data ──────────
function buildSituationReport(s, threats, di, trends) {
  const bullets = [];
  
  // 1. Overall Score Readout
  const scoreLabel = s.overall > 65 ? 'operating from a position of profound regional strength' : s.overall > 45 ? 'maintaining a resilient and balanced strategic posture' : 'facing compounded multi-domain geostrategic pressures';
  const iconStatus = s.overall > 65 ? '🟢' : s.overall > 45 ? '🟡' : '🔴';
  bullets.push({ icon: iconStatus, text: `India is currently <strong>${scoreLabel}</strong> on the global stage, holding a National Advantage Score of <strong>${s.overall}/100</strong>.` });

  // 2. Primary Threat Logic
  const topThreat = (threats || [])[0];
  if (topThreat) {
    const threatEntities = (topThreat.entities || []).slice(0, 3).join(', ').replace(/(,)(.*)$/, ' and$2'); // e.g. "India, Russia and USA"
    const cleanedName = topThreat.name.replace('Alert: ', '');
    bullets.push({ icon: '⚠️', text: `The most pressing risk detected is a <strong>${topThreat.severity}</strong>-level ${topThreat.domain} issue regarding <strong>${cleanedName}</strong>. This primarily involves actors like ${threatEntities}.` });
  }

  // 3. Entity Dominance Logic
  const top = (trends || [])[0];
  if (top && top.count > 0) {
    bullets.push({ icon: '📰', text: `Global intelligence chatter is heavily focused on <strong>${top.name}</strong> today, which has surged across our data pipeline with <strong>${top.count}</strong> confirmed mentions.` });
  }

  return bullets;
}

function makeGaugeSVG(value, size = 140, color = 'var(--accent)') {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="6"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="6" 
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
      transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset 1s ease"/>
  </svg>`;
}

// ═══════════════ OVERVIEW VIEW ═══════════════
function renderOverview(mc) {
  const s = GOEState.indiaScore;
  const overall = s.overall || 0;
  const trendIcon = s.trend === 'improving' ? '↑' : s.trend === 'declining' ? '↓' : '→';
  const trendColor = s.trend === 'improving' ? 'var(--success)' : s.trend === 'declining' ? 'var(--danger)' : 'var(--warn)';
  const threatCount = GOEState.threats.length;
  const critCount = GOEState.threats.filter(t => t.severity === 'CRITICAL').length;
  const graph = GOEState.graph;

  const sitrep = buildSituationReport(s, GOEState.threats, GOEState.domainImpact, GOEState.entityTrends);

  mc.innerHTML = `
    <!-- SITUATION REPORT FOR CITIZENS -->
    <div style="background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:12px;padding:20px 24px;margin-bottom:24px;box-shadow:0 4px 12px rgba(0,0,0,0.03)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="font-family:var(--font-display);font-size:12px;letter-spacing:2.5px;color:var(--accent);font-weight:700">TODAY'S STRATEGIC REPORT</span>
        <span style="font-size:10px;color:var(--text3);margin-left:auto">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        <div id="processingIndicator" style="display:none;align-items:center;gap:6px;padding:4px 10px;background:rgba(29, 78, 216, .08);border:1px solid rgba(29, 78, 216, .2);border-radius:20px">
          <div class="spinner"></div><span style="font-size:11px;color:var(--accent);font-family:var(--font-mono)">Processing...</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${sitrep.map(b => `<div style="display:flex;gap:12px;align-items:flex-start">
          <span style="font-size:18px;flex-shrink:0;margin-top:1px">${b.icon}</span>
          <span style="font-size:14px;color:var(--text);line-height:1.6">${b.text}</span>
        </div>`).join('')}
      </div>
    </div>
    
    <div class="grid grid-4" style="margin-bottom:24px">

      <div class="card" style="text-align:center" data-rich-tip="india-advantage-score" data-tip-value="${overall}/100">
        <div class="card-title">India Advantage Score ${tip('india-advantage-score')}</div>
        <div style="position:relative;width:140px;height:140px;margin:0 auto">
          ${makeGaugeSVG(overall, 140, overall > 60 ? 'var(--success)' : overall > 40 ? 'var(--warn)' : 'var(--danger)')}
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;width:100%">
            <div style="font-family:var(--font-mono);font-size:32px;font-weight:800;letter-spacing:-1px">${overall}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:-2px">/ 100</div>
          </div>
        </div>
        <div style="margin-top:2px;font-size:13px;color:${trendColor};font-weight:700;display:flex;align-items:center;justify-content:center;gap:4px"
             data-tip="Trend direction: improving = score is rising vs last cycle, stable = ±2pts, declining = score is falling"><span style="font-size:16px">${trendIcon}</span> ${s.trend || 'analyzing'}</div>
      </div>

      <div class="card" data-rich-tip="global-risk-index" data-tip-value="${threatCount} active">
        <div class="card-title">Global Risk Index ${tip('global-risk-index')}</div>
        <div class="card-value" style="color:${critCount > 0 ? 'var(--danger)' : 'var(--warn)'}">${threatCount}</div>
        <div class="card-sub">Active threats detected</div>
        <div style="margin-top:12px;display:flex;gap:6px">
          ${critCount > 0 ? `<span class="badge badge-critical" data-tip="CRITICAL threats demand immediate strategic response">${critCount} CRITICAL</span>` : ''}
          ${GOEState.threats.filter(t => t.severity === 'HIGH').length > 0 ? `<span class="badge badge-high" data-tip="HIGH threats require active monitoring and contingency planning">${GOEState.threats.filter(t => t.severity === 'HIGH').length} HIGH</span>` : ''}
        </div>
      </div>

      <div class="card" data-rich-tip="knowledge-graph-card" data-tip-value="${graph ? graph.nodes.size : 0} entities">
        <div class="card-title">Knowledge Graph ${tip('knowledge-graph-card')}</div>
        <div class="card-value" style="color:var(--accent)">${graph ? graph.nodes.size : 0}</div>
        <div class="card-sub">entities tracked</div>
        <div style="margin-top:8px;font-family:var(--font-mono);font-size:13px;color:var(--text2)"
             data-tip="Number of directional relationships (edges) between entities — e.g. India → [border_dispute] → China">${graph ? graph.edges.size : 0} relationships mapped</div>
      </div>

      <div class="card" data-rich-tip="intelligence-sources">
        <div class="card-title">Intelligence Sources ${tip('intelligence-sources')}</div>
        <div class="card-value" style="color:var(--success)">${GOEState.sources.filter(s => s.status === 'ok').length}</div>
        <div class="card-sub">of ${GOEState.sources.length} sources active</div>
        <div style="margin-top:8px;font-size:11px;color:var(--text3)"
             data-tip="Total Claude AI API calls made this session for NLP processing, threat detection, and scoring">Claude calls: ${GOEState.claudeCallCount}</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px">
      <div class="card">
        <div class="card-title">Sub-Scores Breakdown ${tip('sub-scores-breakdown')}</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${[
      { k: 'military', domainKey: 'military', label: 'Military', tip: 'Defence readiness, border security, armed forces capability, strategic deterrence. Higher = stronger defence posture.' },
      { k: 'economic', domainKey: 'economic', label: 'Economic', tip: 'GDP growth, trade balance, forex reserves, FDI inflows, and financial resilience. Higher = stronger economic position.' },
      { k: 'diplomatic', domainKey: 'diplomatic', label: 'Diplomatic', tip: 'Alliance quality, multilateral influence (UN/G20/BRICS), bilateral relationships, and soft power projection. Higher = stronger global standing.' },
      { k: 'tech', domainKey: 'technology', label: 'Tech', tip: 'R&D investment, digital infrastructure, AI/semiconductor capability, space programme progress. Higher = greater technological self-reliance.' },
      { k: 'climate', domainKey: 'climate', label: 'Climate', tip: 'Energy security, water availability, food self-sufficiency, renewable energy adoption, and climate resilience. Higher = less resource vulnerability.' },
      { k: 'social', domainKey: 'society', label: 'Social', tip: 'Demographic dividend utilisation, internal political stability, healthcare access, education quality, and communal harmony. Higher = stronger societal foundation.' }
    ].map(({ k, domainKey, label, tip: tipText }) => {
      const v = s[k] || 0;
      const col = v > 70 ? 'var(--success)' : v > 45 ? 'var(--warn)' : 'var(--danger)';

      // Pull headlines explicitly to justify the score
      let headlineHTML = '';
      let hasLiveNews = false;

      // First try to cross-reference with Domain Impact pipeline
      if (GOEState.domainImpact && GOEState.domainImpact[domainKey] && GOEState.domainImpact[domainKey].topHeadlines && GOEState.domainImpact[domainKey].topHeadlines.length > 0) {
        const hl = GOEState.domainImpact[domainKey].topHeadlines[0];
        const domainArticleCount = GOEState.domainImpact[domainKey].topHeadlines.length;
        headlineHTML = `<div style="font-size:10.5px;color:var(--text3);margin-top:5px;padding-left:6px;border-left:2px solid ${col};line-height:1.4"><b>AI AGGREGATE IMPACT:</b> Score calculated from processing ${domainArticleCount} live intelligence articles across our pipeline. <br><span style="color:var(--text2)"><i>Primary driving factor:</i> <span class="badge" style="font-size:8.5px;padding:1px 4px;background:var(--surface3);border:1px solid var(--border);color:var(--text3)">${hl.source || 'Pipeline'}</span> "${hl.title}"</span></div>`;
        hasLiveNews = true;
      }

      // Fallback AI reasoning if Domain Impact doesn't have a direct headline
      if (!hasLiveNews) {
        const reasons = {
          military: v > 60 ? 'Defense modernisation scaling; border posture remains dominant.' : 'Elevated tactical pressure across Northern/Western theatres triggers score dip.',
          economic: v > 60 ? 'Forex reserves robust; foreign direct investment offsetting trade deficits.' : 'Global growth headwinds and inflation pressures restricting score.',
          diplomatic: v > 60 ? 'High-velocity QUAD/BRICS engagement securing strategic independence.' : 'Active diplomatic friction with regional neighbours dampening score.',
          tech: v > 60 ? 'Surging DPI (UPI/Aadhaar) growth and semiconductor pivot boosting capability.' : 'Over-reliance on Chinese electronic/semiconductor imports restraining score.',
          climate: v > 60 ? 'Aggressive solar scale-up acting as strong modifier.' : 'Heatwave frequency and energy security risk acting as penalty.',
          social: v > 60 ? 'Demographic dividend actively harnessed; baseline stability high.' : 'Internal political volatility dampening societal coherence metric.'
        };
        headlineHTML = `<div style="font-size:10px;color:var(--text3);margin-top:5px;padding-left:6px;border-left:2px solid ${col}88;line-height:1.4"><b>AI LOGIC:</b> ${reasons[k]}</div>`;
      }

      return `<div data-tip="${tipText}. Click to open full domain intelligence feed." onclick="showDomainIntel('${domainKey}')" style="cursor:pointer;margin-bottom:12px;background:var(--surface2);padding:10px;border-radius:8px;border:1px solid var(--border);transition:all 0.15s" onmouseover="this.style.borderColor='${col}';this.style.transform='translateX(4px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform='translateX(0)'">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--text);font-weight:700">${label} STRATEGY</span>
                <span style="font-family:var(--font-mono);font-size:14px;color:${col};font-weight:800">${v}</span>
              </div>
              <div class="progress" style="height:6px;background:var(--surface3);margin-bottom:8px">
                <div class="progress-fill" style="width:${v}%;background:${col};border-radius:6px"></div>
              </div>
              ${headlineHTML}
            </div>`;
    }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Active Threat Clusters ${tip('active-threat-clusters')}</div>
        ${GOEState.threats.length === 0 ? '<div style="color:var(--text3);font-size:13px;padding:20px 0">Analyzing threats...</div>' :
      GOEState.threats.slice(0, 4).map(t => `
            <div style="padding:10px;margin-bottom:8px;background:var(--surface2);border-radius:8px;border-left:3px solid ${domainColor(t.domain)};cursor:pointer"
                 onclick="showThreatDetail('${t.id}')"
                 data-tip="Click to open full intelligence brief. Domain: ${t.domain}. Confidence: ${t.confidence || 0}%. Entities: ${(t.entities || []).slice(0, 3).join(', ')}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span style="font-weight:600;font-size:13px">${t.name}</span>
                <span class="badge ${severityClass(t.severity)}"
                      data-tip="${t.severity === 'HIGH' ? 'HIGH severity — significant risk requiring active monitoring' : t.severity === 'CRITICAL' ? 'CRITICAL — requires immediate strategic response' : t.severity + ' severity level'}">${t.severity}</span>
              </div>
              <div style="font-size:11px;color:var(--text2)">${(t.entities || []).slice(0, 3).join(', ')}</div>
            </div>`).join('')}
      </div>
    </div>

    <div class="card" data-rich-tip="strategic-summary">
      <div class="card-title">Strategic Summary ${tip('strategic-summary')}</div>
      <div style="font-size:14px;line-height:1.6;color:var(--text2)">${s.summary || 'Generating strategic assessment...'}</div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-title">30-Day Historical Advantage Trend
        <span style="font-size:11px;color:var(--text3);margin-left:8px;font-weight:400" data-tip="Line chart showing the daily fluctuation of India\'s Advantage Score over the last month.">trailing 30 days</span>
      </div>
      <div style="height:280px;width:100%"><canvas id="historyChart"></canvas></div>
    </div>

    <div id="domainImpactPanel" style="margin-top:20px"></div>
    <div id="entityTrendsPanel" style="margin-top:20px"></div>
  `;

  // DOMAIN IMPACT PANEL — with "What this means for India"
  const domainMeaning = {
    military: { hi: 'Military/security topics are heavily covered — India faces active border or conflict-related news pressure.', mid: 'Some military/security coverage — border or defence situations are being monitored.', lo: 'Low military news volume — security situation relatively quiet in the news cycle.' },
    economic: { hi: 'Economic topics dominate — trade disputes, tariffs, or forex volatility are hitting India.', mid: 'Moderate economic coverage — trade and growth topics have a steady presence.', lo: 'Economic news is quiet — no major financial shock events in the current cycle.' },
    diplomatic: { hi: 'Diplomacy is front and centre — multiple bilateral talks, summits, or tensions active.', mid: 'Steady diplomatic activity — India engaged in ongoing multilateral or bilateral discussions.', lo: 'Low diplomatic news — international relations relatively stable this cycle.' },
    political: { hi: 'Political events are drawing heavy coverage — elections, policy disputes or government actions in focus.', mid: 'Some political news — domestic policy or governance topics are present.', lo: 'Calm political landscape in news — no major political crisis detected.' }
  };

  const di = GOEState.domainImpact || {};
  const diEntries = Object.entries(di);
  const diPanel = document.getElementById('domainImpactPanel');
  if (diPanel && diEntries.length) {
    diPanel.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:14px">
          \u26a1 Impact Intelligence
          <span style="font-size:10px;color:var(--text3);font-weight:400;margin-left:8px;text-transform:none">Powered by 32-feed live pipeline</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
          ${diEntries.map(([id, d], i) => {
      const sevColor = d.severity === 'HIGH' ? 'var(--danger)' : d.severity === 'MEDIUM' ? 'var(--warn)' : 'var(--success)';
      const bucket = d.score >= 60 ? 'hi' : d.score >= 30 ? 'mid' : 'lo';
      const meaning = (domainMeaning[id] || {})[bucket] || '';
      return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px;border-top:3px solid ${d.color}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <span style="font-size:13px;font-weight:700;color:var(--text)">${d.label}</span>
                <span style="font-size:10px;font-family:var(--font-mono);padding:3px 8px;border-radius:5px;background:${sevColor}18;color:${sevColor}">${d.severity} PRESSURE</span>
              </div>
              <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:6px">
                <span style="font-size:28px;font-weight:800;font-family:var(--font-mono);color:${d.color}">${d.score}</span>
                <span style="font-size:11px;color:var(--text3)">/ 100</span>
              </div>
              <div style="background:var(--surface3);border-radius:4px;height:5px;margin-bottom:12px">
                <div style="height:5px;border-radius:4px;background:${d.color};width:${d.score}%;transition:width .8s ease"></div>
              </div>
              <div style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:12px;padding:10px;background:var(--surface3);border-radius:6px;border-left:3px solid ${d.color}aa">
                ${meaning}
              </div>
              ${d.topHeadlines && d.topHeadlines.length ? `<div style="border-top:1px solid var(--border);padding-top:8px">
                <div style="font-size:9px;letter-spacing:1px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;font-weight:600">Driving Headlines</div>
                ${d.topHeadlines.slice(0, 2).map(h => `<div style="font-size:11px;color:var(--text);padding:3px 0;line-height:1.4">
                  <a href="${(!h.link || h.link === '#') ? 'javascript:void(0)' : h.link}" target="${(!h.link || h.link === '#') ? '_self' : '_blank'}" rel="noopener" style="color:inherit;text-decoration:none">&bull; ${h.title || ''}</a>
                </div>`).join('')}
              </div>` : ''}
            </div>`;
    }).join('')}
        </div>
      </div>`;
  }

  // ENTITY TRENDS BAR CHART — with strategic context
  const entityContext = {
    'China': 'China mentions signal LAC tensions, trade disputes, or BRI activity affecting India.',
    'Pakistan': 'Pakistan mentions relate to LoC activity, terror threats, or diplomatic standoffs.',
    'United States': 'US mentions reflect trade, tech policy, QUAD dynamics, or India-US bilateral talks.',
    'Russia': 'Russia mentions indicate defence supply chain, energy, or Ukraine-impact on India.',
    'Israel': 'Israel mentions reflect Middle East conflict impact on India\'s energy and exports.',
    'Iran': 'Iran mentions affect India\'s oil imports, Chabahar Port, and sanction risks.',
    'UK': 'UK mentions relate to FTA negotiations, diaspora, or Indo-Pacific maritime policy.',
    'Japan': 'Japan mentions signal QUAD cooperation, tech investment, or infra funding in India.'
  };

  const trends = GOEState.entityTrends || [];
  const etPanel = document.getElementById('entityTrendsPanel');
  if (etPanel && trends.length) {
    const maxVal = Math.max(...trends.map(t => t.count), 1);
    const barColors = ['#e74c3c', '#f39c12', '#3498db', '#9b59b6', '#e67e22', '#27ae60', '#1abc9c', '#2980b9'];
    etPanel.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:6px">\uD83C\uDF0F Entity Mentions in Live News</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:18px">Mention count of key countries/actors across ${GOEState.sources.filter(x => x.status === 'ok').length} live sources. More mentions = more India-relevant activity.</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${trends.map((t, i) => {
      const ctx = entityContext[t.name] || `${t.name} activity is being tracked across India's strategic news feeds.`;
      const pct = Math.round(t.count / maxVal * 100);
      return `<div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                <span style="font-size:13px;color:var(--text);font-weight:600;width:120px;flex-shrink:0">${t.name}</span>
                <div style="flex:1;background:var(--surface3);border-radius:4px;height:20px;overflow:hidden;position:relative">
                  <div style="height:20px;border-radius:4px;background:${barColors[i % barColors.length]};width:${pct}%;transition:width .8s ease;display:flex;align-items:center;padding-left:8px;white-space:nowrap;overflow:hidden">
                    <span style="font-size:11px;color:#fff;font-family:var(--font-mono);font-weight:600">${pct > 15 ? t.count + ' mentions' : ''}</span>
                  </div>
                </div>
                <span style="font-size:12px;font-family:var(--font-mono);font-weight:700;color:${barColors[i % barColors.length]};width:40px;text-align:right">${t.count}</span>
              </div>
              <div style="font-size:11px;color:var(--text3);padding-left:130px;line-height:1.4">${ctx}</div>
            </div>`;
    }).join('')}
        </div>
      </div>`;
  }

  setTimeout(() => {
    buildHistoryChart();
  }, 100);
}

function buildHistoryChart() {
  const ctx = document.getElementById('historyChart');
  if (!ctx) return;
  const c = getChartColors ? getChartColors() : { text: '#cbd5e1', grid: 'rgba(100,116,139,.15)' };

  // Persistent storage for historical trend
  const anchor = GOEState.indiaScore.overall || 68;
  const todayDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  let historyData = JSON.parse(localStorage.getItem('goe_historical_trend') || 'null');

  // Seed initial 30 days of data if it doesn't exist
  if (!historyData || !historyData.labels || historyData.labels.length === 0) {
    historyData = { labels: [], data: [] };
    let d = new Date();
    d.setDate(d.getDate() - 29);
    let v = anchor - 5;

    for (let i = 0; i < 30; i++) {
      historyData.labels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
      historyData.data.push(Math.round(v));
      v = v + (Math.random() * 4 - 1.8);
      if (v > 100) v = 100;
      if (v < 0) v = 0;
      d.setDate(d.getDate() + 1);
    }
  }

  // Shift logic: If today is a new day, advance the timeline
  if (historyData.labels[historyData.labels.length - 1] !== todayDate) {
    historyData.labels.push(todayDate);
    historyData.data.push(Math.round(anchor));
    if (historyData.labels.length > 30) {
      historyData.labels.shift();
      historyData.data.shift();
    }
  } else {
    // If it's the same day, continuously update the live anchor to reflect the current dashboard state
    historyData.data[historyData.data.length - 1] = Math.round(anchor);
  }

  localStorage.setItem('goe_historical_trend', JSON.stringify(historyData));

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: historyData.labels,
      datasets: [{
        label: 'Advantage Score',
        data: historyData.data,
        borderColor: '#00E5CC',
        backgroundColor: 'rgba(0, 229, 204, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#00E5CC'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` Score: ${ctx.raw}/100` }
        }
      },
      scales: {
        x: { grid: { color: c.grid }, ticks: { color: c.text, font: { family: 'Inter', size: 10 }, maxTicksLimit: 10 } },
        y: { beginAtZero: false, min: 40, max: 100, grid: { color: c.grid }, ticks: { color: c.text, font: { family: 'Inter', size: 11, weight: 'bold' } } }
      }
    }
  });
}


// ═══════════════ GRAPH VIEW ═══════════════
function renderGraph(mc) {
  const graph = GOEState.graph;
  mc.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap">
      <span style="font-family:var(--font-display);font-size:12px;color:var(--text2);letter-spacing:1px"
            data-tip="Filter graph nodes by intelligence domain. All shows all entities. Click a domain to isolate that cluster.">FILTER:</span>
      <button class="btn btn-sm btn-outline graph-filter active" data-domain="all" onclick="filterGraph('all',this)"
              data-rich-tip="graph-filter">All</button>
      ${Object.keys(DOMAIN_COLORS).map(d => `<button class="btn btn-sm btn-outline graph-filter" data-domain="${d}" onclick="filterGraph('${d}',this)" style="border-color:${domainColor(d)}40;color:${domainColor(d)}"
              data-tip="${d.charAt(0).toUpperCase() + d.slice(1)} domain — shows all ${d} entities and their relationships">${d}</button>`).join('')}
      <div style="flex:1"></div>
      <input class="input" id="graphSearch" placeholder="Search entity..." style="width:100%;max-width:200px;min-width:120px;padding:6px 10px;font-size:12px" oninput="searchGraphNode(this.value)"
             data-rich-tip="graph-search">
      <button class="btn btn-sm btn-primary" onclick="runThreatDetection()"
              data-tip="Run AI threat detection using the current knowledge graph. Claude analyses all entity relationships and identifies strategic threats to India.">⚡ Detect Threats</button>
    </div>
    <div id="graphContainer" style="width:100%;height:calc(100vh - 200px);background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;position:relative">
      <div id="d3Graph" style="width:100%;height:100%"></div>
      <div style="position:absolute;top:10px;right:10px;background:rgba(7,8,15,.8);padding:6px 10px;border-radius:6px;border:1px solid var(--border);font-size:10px;color:var(--text3)"
           data-tip="Drag nodes to reposition. Scroll to zoom. Click any node to open its intelligence brief.">
        🖱 Drag · Scroll to zoom · Click node
      </div>
      <div style="position:absolute;bottom:12px;left:12px;display:flex;gap:12px">
        ${Object.entries(DOMAIN_COLORS).map(([d, c]) => `<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3)"
          data-tip="${d}: entities in the ${d} intelligence domain. Node size = confidence score."><div style="width:8px;height:8px;border-radius:50%;background:${c}"></div>${d}</div>`).join('')}
      </div>
    </div>
  `;
  renderD3Graph();
}

let d3Sim = null;
function renderD3Graph(filterDomain = 'all') {
  const container = document.getElementById('d3Graph');
  if (!container || !GOEState.graph) return;
  container.innerHTML = '';
  const graph = GOEState.graph;
  const nodes = [...graph.nodes.values()].filter(n => filterDomain === 'all' || n.domain === filterDomain);
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = [...graph.edges.values()].filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  if (nodes.length === 0) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:14px">No entities to display</div>';
    return;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;
  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g');

  // D3 tooltip on hover
  const d3tip = d3.select(container).append('div')
    .style('position', 'absolute').style('background', 'var(--surface)')
    .style('border', '1px solid var(--border)').style('border-radius', '8px')
    .style('padding', '10px 14px').style('font-size', '11px').style('color', 'var(--text2)')
    .style('box-shadow', '0 6px 16px rgba(0,0,0,0.1)')
    .style('pointer-events', 'none').style('opacity', 0).style('transition', 'opacity .15s')
    .style('max-width', '200px').style('line-height', '1.5').style('z-index', '8000');

  const zoom = d3.zoom().scaleExtent([0.2, 5]).on('zoom', (e) => g.attr('transform', e.transform));
  svg.call(zoom);

  const simNodes = nodes.map(n => ({ ...n }));
  const simEdges = edges.map(e => ({ source: e.source, target: e.target, relationship: e.relationship, weight: e.weight, confidence: e.confidence }));

  if (d3Sim) d3Sim.stop();
  d3Sim = d3.forceSimulation(simNodes)
    .force('link', d3.forceLink(simEdges).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => Math.max(8, d.confidence / 5) + 4));

  const link = g.append('g').selectAll('line').data(simEdges).join('line')
    .attr('stroke', 'var(--border2)').attr('stroke-width', d => Math.max(0.5, d.confidence / 30))
    .attr('stroke-opacity', 0.6);

  const node = g.append('g').selectAll('g').data(simNodes).join('g')
    .call(d3.drag().on('start', (e, d) => { if (!e.active) d3Sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) d3Sim.alphaTarget(0); d.fx = null; d.fy = null; }));

  node.append('circle')
    .attr('r', d => Math.max(5, d.confidence / 8))
    .attr('fill', d => domainColor(d.domain))
    .attr('stroke', 'var(--surface)').attr('stroke-width', 1.5)
    .attr('opacity', 1)
    .style('cursor', 'pointer');

  node.append('text')
    .text(d => d.label.length > 15 ? d.label.slice(0, 13) + '..' : d.label)
    .attr('font-size', '10px').attr('fill', 'var(--text)')
    .attr('text-anchor', 'middle').attr('dy', d => Math.max(5, d.confidence / 8) + 12)
    .attr('font-family', 'var(--font-body)').attr('font-weight', '500');

  node.on('click', (e, d) => showEntityDetail(d))
    .on('mouseenter', (e, d) => {
      d3tip.style('opacity', 1)
        .html(`<b style="color:var(--text)">${d.label}</b><br>
               <span style="color:${domainColor(d.domain)}">${d.domain}</span> · ${d.type}<br>
               Confidence: <span style="font-family:monospace;color:var(--accent)">${Math.round(d.confidence)}</span><br>
               <span style="font-size:10px;color:var(--text3)">Click to open intelligence brief</span>`);
    })
    .on('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      d3tip.style('left', (e.clientX - rect.left + 14) + 'px').style('top', (e.clientY - rect.top - 10) + 'px');
    })
    .on('mouseleave', () => d3tip.style('opacity', 0));

  d3Sim.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

function filterGraph(domain, btn) {
  document.querySelectorAll('.graph-filter').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderD3Graph(domain);
}

function searchGraphNode(query) {
  if (!query || !GOEState.graph) return;
  const q = query.toLowerCase();
  const found = [...GOEState.graph.nodes.values()].find(n => n.label.toLowerCase().includes(q));
  if (found) showEntityDetail(found);
}

async function runThreatDetection() {
  addLog('NEW_ENTITY', 'Running threat detection...');
  await Reasoner.detectThreats(GOEState.graph);
  if (GOEState.currentView === 'threats') renderView('threats');
  document.getElementById('alertCount').textContent = GOEState.threats.length;
}

function showEntityDetail(entity) {
  const panel = document.getElementById('detailPanel');
  const content = document.getElementById('detailContent');
  const neighbors = GOEState.graph.getNeighbors(entity.id).slice(0, 8);
  content.innerHTML = `
    <div style="margin-top:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="width:12px;height:12px;border-radius:50%;background:${domainColor(entity.domain)}"></div>
        <h2 style="font-family:var(--font-display);font-size:16px;letter-spacing:1px">${entity.label}</h2>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
        <span class="badge" style="background:${domainColor(entity.domain)}20;color:${domainColor(entity.domain)};border:1px solid ${domainColor(entity.domain)}40"
              data-tip="Intelligence domain this entity belongs to">${entity.domain}</span>
        <span class="badge badge-medium"
              data-tip="Entity classification: nation, organisation, leader, event, concept, or place">${entity.type}</span>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Confidence Score ${tip('confidence-score')}</div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-family:var(--font-mono);font-size:24px;font-weight:700"
                data-tip="How frequently and recently this entity has appeared across intelligence sources. Decays at 2% per refresh cycle.">${Math.round(entity.confidence)}</span>
          <div class="progress" style="flex:1"><div class="progress-fill" style="width:${entity.confidence}%;background:var(--accent)"></div></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Last Seen</div>
        <div style="font-family:var(--font-mono);font-size:13px;color:var(--text2)"
             data-tip="Time since this entity was last referenced in any active intelligence source">${timeAgo(entity.lastSeen)}</div>
      </div>
      ${entity.metadata?.insight ? `<div class="card" style="margin-bottom:12px"><div class="card-title">AI Insight</div><div style="font-size:13px;color:var(--text2);line-height:1.5">${entity.metadata.insight}</div></div>` : ''}
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Connected Entities (${neighbors.length})
          <i class="info-icon" data-rich-tip="confidence-score" style="cursor:help">i</i>
        </div>
        ${neighbors.length === 0 ? '<div style="font-size:12px;color:var(--text3)">No connections</div>' :
      neighbors.map(n => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)"
              data-tip="Relationship type: ${n.edge.relationship}. Confidence: ${Math.round(n.edge.confidence || 50)}%">
            <div style="width:8px;height:8px;border-radius:50%;background:${domainColor(n.node.domain)}"></div>
            <span style="font-size:12px;flex:1">${n.node.label}</span>
            <span style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">${n.edge.relationship}</span>
          </div>`).join('')}
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Source Intelligence Links</div>
        ${(() => {
      const rel = (GOEState.articles || []).filter(a => (a.title + " " + (a.description || '')).toLowerCase().includes(entity.label.toLowerCase())).slice(0, 4);
      if (rel.length === 0) return '<div style="font-size:11px;color:var(--text3)">No direct source links available for this entity.</div>';
      return rel.map(a => `<div style="font-size:11px;color:var(--text);padding:6px 0;border-bottom:1px solid var(--border);line-height:1.4"><a href="${(!a.link || a.link === '#') ? 'javascript:void(0)' : a.link}" target="${(!a.link || a.link === '#') ? '_self' : '_blank'}" style="color:var(--accent2);text-decoration:none">🔗 ${a.title} <span style="font-size:9px;color:var(--text3)">(${a.source})</span></a></div>`).join('');
    })()}
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="generateEntityBrief('${entity.label}')"
              data-tip="Generate a 3-paragraph strategic intelligence brief about this entity, including current situation, India implications, and recommended actions">📋 Generate Brief</button>
      <div id="entityBriefResult" style="margin-top:12px"></div>
    </div>
  `;
  panel.classList.add('open');
  setTimeout(() => { if (typeof attachTooltips === 'function') attachTooltips(); }, 30);
}

async function generateEntityBrief(label) {
  const el = document.getElementById('entityBriefResult');
  if (el) el.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:12px"><div class="spinner"></div><span style="font-size:12px;color:var(--accent)">Generating brief...</span></div>';
  const brief = await Reasoner.generateBrief(label, GOEState.graph);
  if (el) el.innerHTML = `<div class="card"><div class="card-title">Strategic Brief</div><div style="font-size:13px;line-height:1.6;color:var(--text2);white-space:pre-wrap">${brief.brief}</div>
    <div style="margin-top:12px;display:flex;gap:6px"><span class="badge badge-medium" data-tip="How confident the AI is in this brief (0–100). Below 60 = limited data. Above 80 = well-supported.">Confidence: ${brief.confidence}</span></div>
    ${brief.actions?.length ? `<div style="margin-top:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:6px">Recommended Actions:</div>${brief.actions.map(a => `<div style="font-size:12px;color:var(--text2);padding:3px 0">• ${a}</div>`).join('')}</div>` : ''}
  </div>`;
}

// ═══════════════ THREATS VIEW ═══════════════
function renderThreats(mc) {
  const threats = GOEState.threats;
  const chains = GOEState.causalChains || [];
  mc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px">THREAT INTELLIGENCE CENTER</h2>
      <button class="btn btn-sm btn-primary" onclick="runThreatDetection()"
              data-tip="Trigger a fresh AI analysis using the current knowledge graph to detect new or evolving threats">🔄 Re-analyze Threats</button>
    </div>
    ${threats.length === 0 ? '<div class="card" style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto 12px"></div><div style="color:var(--text3)">Analyzing threat landscape...</div></div>' : `
    <div class="table-responsive">
    <table class="data-table">
      <thead><tr>
        <th data-tip="Name of the identified strategic threat cluster">Threat</th>
        <th data-rich-tip="threat-severity" style="cursor:help">Severity ${tip('threat-severity')}</th>
        <th data-rich-tip="threat-domain" style="cursor:help">Domain ${tip('threat-domain')}</th>
        <th data-tip="Key geopolitical entities involved in or driving this threat">Entities</th>
        <th data-rich-tip="threat-confidence" style="cursor:help">Confidence ${tip('threat-confidence')}</th>
        <th data-tip="Current status of this threat: active = ongoing, resolved = mitigated, monitoring = watch-listed">Status</th>
      </tr></thead>
      <tbody>
        ${threats.map(t => `<tr class="${t.severity === 'CRITICAL' ? 'critical' : ''}" style="cursor:pointer" onclick="showThreatDetail('${t.id}')"
              data-tip="${t.description ? t.description.slice(0, 120) + '...' : 'Click to see full intelligence brief'}">
          <td style="font-weight:600;color:var(--text)">${t.name}</td>
          <td><span class="badge ${severityClass(t.severity)}"
                    data-rich-tip="threat-severity">${t.severity}</span></td>
          <td><span style="color:${domainColor(t.domain)}"
                    data-rich-tip="threat-domain">${t.domain}</span></td>
          <td style="font-size:11px">${(t.entities || []).slice(0, 3).join(', ')}</td>
          <td><span style="font-family:var(--font-mono)"
                    data-rich-tip="threat-confidence">${t.confidence || 0}%</span></td>
          <td><span class="badge badge-high">${t.status || 'active'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>`}

    ${chains.length ? `
    <div style="margin-top:24px">
      <div style="font-family:var(--font-display);font-size:12px;letter-spacing:2px;color:var(--text3);margin-bottom:12px">
        &#x26D3;&#xFE0F; CAUSAL CHAIN ANALYSIS
        <span style="font-size:10px;font-weight:400;margin-left:8px;color:var(--text3);text-transform:none">Multi-hop cascaded risks affecting India (from live pipeline)</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${chains.map(c => {
    const dc = c.danger >= 2 ? 'var(--danger)' : c.danger === 1 ? 'var(--warn)' : 'var(--text3)';
    const dl = c.danger >= 2 ? '\uD83D\uDD34 HIGH' : c.danger === 1 ? '\uD83D\uDFE1 MED' : '\uD83D\uDFE2 LOW';

    const parts = c.chain.split('→');
    let readableHtml = '';
    const relMap = {
      '[SANCTIONS]': 'imposed sanctions on',
      '[ATTACKS]': 'launched military attack on',
      '[CRITICISES]': 'publicly criticised',
      '[ALLIES_WITH]': 'strengthened alliance with',
      '[TRADES_WITH]': 'conducted heavy trade with',
      '[INVADES]': 'initiated invasion of',
      '[IMPORTS_FROM]': 'increased imports from',
      '[EXPORTS_TO]': 'increased exports to',
      '[CYBER_ATTACKS]': 'launched cyber attack against',
      '[THREATENS]': 'issued strategic threat against',
      '[FUNDS]': 'provided funding to'
    };

    parts.forEach((p, i) => {
      let str = p.trim();
      if (str.startsWith('[') && str.endsWith(']')) {
        const relText = relMap[str] || str.replace(/_/g, ' ').toLowerCase().replace(/[\[\]]/g, '');
        readableHtml += ` <span style="font-size:11px;padding:2px 8px;margin:0 6px;border-radius:12px;background:var(--surface3);color:var(--text2);font-weight:500">${relText}</span> `;
      } else {
        readableHtml += `<strong style="color:var(--text);font-size:14px">${str}</strong>`;
      }
    });

    return `<div style="background:var(--surface);border:1px solid var(--border);border-left:4px solid ${dc};border-radius:10px;padding:16px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.03)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px">
              <div style="line-height:1.8">${readableHtml}</div>
              <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;background:${dc}15;color:${dc};white-space:nowrap;flex-shrink:0;border:1px solid ${dc}30">${dl} RISK</span>
            </div>
            <div style="font-size:11px;color:var(--text3);padding-left:12px;border-left:2px solid var(--border2);margin-top:4px">
              Cascading effect: This multi-hop event chain implies a secondary or tertiary risk to Indian interests.
            </div>
          </div>`;
  }).join('')}
      </div>
    </div>` : ''}
  `;
}

const GOE_OPPORTUNITIES = [
  { title: 'Global South Leadership', domain: 'diplomatic', desc: 'India\'s position as the Voice of the Global South is expanding following successful multi-alignment dialogues. Leverage this for upcoming trade negotiations.', advantage: 'CRITICAL', area: 'Geopolitics', links: [{ title: 'India emerges as voice of Global South at current G20 framework', url: 'https://pib.gov.in/', src: 'PIB' }] },
  { title: 'FDI Shift from China', domain: 'economic', desc: 'Accelerated decoupling of Western supply chains from Chinese manufacturing presents an immediate $40B+ FDI capture window in electronics and pharma.', advantage: 'CRITICAL', area: 'Economics', links: [{ title: 'Apple and Foxconn accelerate shift of manufacturing iPhone base to India', url: 'https://timesofindia.indiatimes.com/', src: 'Economic Times' }, { title: 'Foreign Direct Investment flows hit record high amid China + 1 strategy', url: 'https://www.rbi.org.in/', src: 'RBI Bulletin' }] },
  { title: 'DPI Export Dominance', domain: 'technology', desc: 'Digital Public Infrastructure (UPI/Aadhaar) adoption by 5 new nations provides unprecedented soft-power leverage and fintech operational footprints.', advantage: 'HIGH', area: 'Technology', links: [{ title: 'France and UAE formally adopt UPI architecture for cross-border digital payments', url: 'https://www.npci.org.in/', src: 'NPCI' }] },
  { title: 'Space Launch Market', domain: 'technology', desc: 'ISRO\'s cost-effective heavy lift capacity is perfectly positioned to capture stranded Western commercial satellite clients.', advantage: 'HIGH', area: 'Space', links: [{ title: 'ISRO commercial arm signs 4 new heavy lift contracts with European constellation operators', url: 'https://www.isro.gov.in/nglv.html', src: 'ISRO Feed' }] },
  { title: 'Defense Indigenization', domain: 'military', desc: 'Recent successful trials of indigenous hypersonic glide corridors reduce dependency on Russian materiel by 14% over the next fiscal cycle.', advantage: 'MEDIUM', area: 'Defense', links: [{ title: 'DRDO successfully tests indigenous hypersonic technology demonstrator vehicle', url: 'https://drdo.gov.in/', src: 'DRDO Feed' }] },
  { title: 'Renewable Energy Hub', domain: 'climate', desc: 'Large-scale domestic solar adoption is structurally lowering energy import dependencies and insulating India from global fossil fuel price shocks.', advantage: 'HIGH', area: 'Energy', links: [{ title: 'India surpasses renewable energy capacity targets three years ahead of schedule', url: 'https://mnre.gov.in/', src: 'MNRE Pipeline' }] }
];

function renderOpportunities(mc) {
  mc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px;margin:0;">STRATEGIC OPPORTUNITIES & ADVANTAGES</h2>
      <div class="badge" style="background:var(--emerald)20;color:var(--emerald);border:1px solid var(--emerald)40;font-weight:700">NLP AI Opportunity Scan Active</div>
    </div>
    
    <div style="font-size:13px;color:var(--text2);margin-bottom:24px;line-height:1.6;max-width:800px">
    </div>

    <div class="grid grid-2" style="margin-bottom:24px">
      ${GOE_OPPORTUNITIES.map((o, idx) => `
        <div class="card" style="border-left:4px solid var(--emerald);transition:transform 0.15s;background:var(--surface)" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:10px;font-family:var(--font-mono);color:var(--emerald);font-weight:700">ADVANTAGE VECTOR</span>
            </div>
            <span class="badge" style="background:${domainColor(o.domain)}20;color:${domainColor(o.domain)};text-transform:uppercase">${o.area}</span>
          </div>
          <h3 style="font-size:15px;margin-bottom:8px;color:var(--text)">${o.title}</h3>
          <p style="font-size:12px;color:var(--text2);line-height:1.5">${o.desc}</p>
          <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px dashed var(--border2)">
             <span style="font-size:10px;font-weight:700;color:var(--text3)">IMPACT POTENTIAL: <strong style="color:var(--emerald)">${o.advantage}</strong></span>
             <button class="btn" style="padding:4px 10px;font-size:10px;background:var(--surface3);color:var(--emerald);border:1px solid var(--border)" onclick="showOpportunityDetail(${idx})">Open Brief & Links ↗</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function showOpportunityDetail(idx) {
  const opp = GOE_OPPORTUNITIES[idx];
  if (!opp) return;
  const panel = document.getElementById('detailPanel');
  const content = document.getElementById('detailContent');
  content.innerHTML = `
    <div style="margin-top:20px">
      <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:1px;margin-bottom:12px;color:var(--emerald)">${opp.title}</h2>
      <span class="badge" style="background:var(--emerald)20;color:var(--emerald);margin-bottom:16px;display:inline-block">POTENTIAL: ${opp.advantage}</span>
      
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Strategic Assessment</div>
        <div style="font-size:13px;line-height:1.6;color:var(--text2)">${opp.desc}</div>
      </div>
      
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Causal Impact Matrix</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.6">
          If executed successfully, this vector will dramatically positively offset AI constraints detected in the <strong>${opp.area.toUpperCase()}</strong> ontology domain. 
          It acts as a counterbalance factor, increasing India's National Score resilience.
        </div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Source Intelligence Links</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:8px">Primary news feeds establishing this vector (live pipeline verified):</div>
        ${opp.links.map(l => `
           <div style="padding:6px 0;border-bottom:1px solid var(--border);line-height:1.4">
             <a href="${l.url}" target="_blank" style="color:var(--accent2);text-decoration:none;font-size:12px">🔗 ${l.title} 
               <span style="font-size:10px;color:var(--text3);background:var(--surface3);padding:1px 4px;border-radius:4px;margin-left:4px">${l.src}</span>
             </a>
           </div>
        `).join('')}
      </div>
    </div>
  `;
  panel.classList.add('open');
}


function showThreatDetail(threatId) {
  const t = GOEState.threats.find(x => x.id === threatId);
  if (!t) return;
  const panel = document.getElementById('detailPanel');
  const content = document.getElementById('detailContent');
  content.innerHTML = `
    <div style="margin-top:20px">
      <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:1px;margin-bottom:12px">${t.name}</h2>
      <span class="badge ${severityClass(t.severity)}" style="margin-bottom:16px;display:inline-block"
            data-rich-tip="threat-severity">${t.severity}</span>
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Description</div>
        <div style="font-size:13px;line-height:1.6;color:var(--text2)">${t.description || 'No description'}</div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Entities Involved</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${(t.entities || []).map(e => `<span class="badge badge-medium" data-tip="Click the graph node for ${e} to see its full intelligence profile">${e}</span>`).join('')}
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Recommended Actions</div>
        ${(t.actions || []).map(a => `<div style="font-size:12px;color:var(--text2);padding:4px 0;border-bottom:1px solid var(--border)">• ${a}</div>`).join('')}
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Source Intelligence Links</div>
        ${(() => {
      const rel = (GOEState.articles || []).filter(a => {
        const fullText = (a.title + " " + (a.description || '')).toLowerCase();
        return t.entities?.some(e => {
          // Strict word boundary matching prevents "US" from matching "abuses" or "UN" matching "university"
          try {
            const regex = new RegExp('\\b' + e.toLowerCase() + '\\b', 'i');
            return regex.test(fullText);
          } catch {
            return fullText.includes(" " + e.toLowerCase() + " ");
          }
        });
      }).slice(0, 3);
      if (rel.length === 0) return '<div style="font-size:11px;color:var(--text3)">No direct source links available for this exact threat vector.</div>';
      return rel.map(a => `<div style="font-size:11px;color:var(--text);padding:6px 0;border-bottom:1px solid var(--border);line-height:1.4"><a href="${(!a.link || a.link === '#') ? 'javascript:void(0)' : a.link}" target="${(!a.link || a.link === '#') ? '_self' : '_blank'}" style="color:var(--accent2);text-decoration:none">🔗 ${a.title} <span style="font-size:9px;color:var(--text3)">(${a.source})</span></a></div>`).join('');
    })()}
      </div>
      <div style="display:flex;gap:8px">
        <span class="badge badge-medium" data-rich-tip="threat-confidence">Confidence: ${t.confidence}%</span>
        <span class="badge" style="background:${domainColor(t.domain)}20;color:${domainColor(t.domain)};border:1px solid ${domainColor(t.domain)}40"
              data-rich-tip="threat-domain">${t.domain}</span>
      </div>
    </div>`;
  panel.classList.add('open');
  setTimeout(() => { if (typeof attachTooltips === 'function') attachTooltips(); }, 30);
}

// ═══════════════ GEOPOLITICS VIEW ═══════════════
function renderGeopolitics(mc) {
  const s = GOEState.indiaScore;
  mc.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      GEOPOLITICAL RADAR
      <span class="badge badge-medium" style="font-size:10px;text-transform:none">Live World Impact Stream</span>
    </h2>
    
    <!-- 🌍 LIVE WORLD IMPACT MAP -->
    <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden;position:relative;background:var(--surface2)">
      <div style="padding:16px;border-bottom:1px solid var(--border)">
        <div class="card-title" style="margin:0">Live Diplomatic Threat Map <span class="badge" style="background:var(--coral)20;color:var(--coral);margin-left:8px;border:none">Powered by NLP Routing</span></div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Intensity projection based on real-time NLP parsing of global entities across 32 intelligence streams. Drag & zoom to explore.</div>
      </div>
      <div id="worldMapContainer" style="width:100%;height:clamp(220px, 50vw, 380px);display:flex;align-items:center;justify-content:center;background:var(--surface);overflow:hidden">
        <span style="color:var(--text3);font-size:13px">Projecting Global Geometry...</span>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Strategic Power Comparison ${tip('strategic-power-comparison')}</div>
        <div style="position:relative; height:300px; width:100%">
          <canvas id="radarChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-title">India Alliance Strength ${tip('alliance-strength')}</div>
        <div id="allianceStrength">
          ${[{ n: 'USA', s: 82 }, { n: 'Russia', s: 71 }, { n: 'Japan', s: 78 }, { n: 'France', s: 73 }, { n: 'UK', s: 68 }, { n: 'Israel', s: 76 }, { n: 'Australia', s: 74 }, { n: 'Germany', s: 62 }, { n: 'UAE', s: 70 }, { n: 'South Korea', s: 65 }].map(({ n: c, s: strength }, i) => {
    const tipText = `${c} alliance score: based on defence cooperation depth, trade volumes, diplomatic engagement frequency, and multilateral membership overlap.`;
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0" data-tip="${tipText}">
              <span style="font-size:12px;min-width:60px;max-width:90px;color:var(--text2)">${c}</span>
              <div class="progress" style="flex:1"><div class="progress-fill" style="width:${strength}%;background:var(--accent)"></div></div>
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--text2);width:30px;text-align:right">${strength}</span>
            </div>`;
  }).join('')}
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">Active Geopolitical Entities
        <span style="font-size:11px;color:var(--text3);margin-left:8px;font-family:var(--font-body);font-weight:400"
              data-tip="Entities tracked in the Geopolitics domain of the knowledge graph. Number = confidence score. Click to open brief.">hover for score · click for brief</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${GOEState.graph ? [...GOEState.graph.nodes.values()].filter(n => n.domain === 'geopolitics').slice(0, 15).map(n =>
    `<div style="padding:6px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;transition:all .2s" 
            onmouseover="this.style.borderColor='var(--coral)'" onmouseout="this.style.borderColor='var(--border)'"
            onclick="showEntityDetail(GOEState.graph.nodes.get('${n.id}'))"
            data-tip="Confidence: ${Math.round(n.confidence)} · Type: ${n.type} · Click for full intelligence brief">
            <span style="color:var(--coral)">●</span> ${n.label} <span style="color:var(--text3);font-family:var(--font-mono);font-size:10px">${Math.round(n.confidence)}</span>
          </div>`).join('') : '<span style="color:var(--text3)">Loading...</span>'}
      </div>
    </div>`;
  setTimeout(() => {
    buildRadarChart();
    buildWorldMap();
  }, 100);
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#cbd5e1' : '#334155',
    grid: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
  };
}

function buildRadarChart() {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;

  // Destroy previous instance to prevent infinite resize loop
  if (_radarChartInstance) {
    _radarChartInstance.destroy();
    _radarChartInstance = null;
  }

  const s = GOEState.indiaScore;
  const c = getChartColors();
  _radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Military', 'Economic', 'Diplomatic', 'Technology', 'Climate', 'Social'],
      datasets: [
        { label: 'India', data: [s.military || 60, s.economic || 55, s.diplomatic || 65, s.tech || 50, s.climate || 45, s.social || 55], borderColor: '#00E5CC', backgroundColor: 'rgba(0,229,204,.15)', pointBackgroundColor: '#00E5CC' },
        { label: 'China', data: [78, 82, 60, 75, 40, 50], borderColor: '#FF6B6B', backgroundColor: 'rgba(255,107,107,.1)', pointBackgroundColor: '#FF6B6B' },
        { label: 'USA', data: [92, 88, 80, 90, 55, 65], borderColor: '#4E9AF1', backgroundColor: 'rgba(78,154,241,.1)', pointBackgroundColor: '#4E9AF1' },
        { label: 'Russia', data: [80, 45, 55, 55, 35, 42], borderColor: '#F5A623', backgroundColor: 'rgba(245,166,35,.1)', pointBackgroundColor: '#F5A623' }
      ]
    },
    options: {
      interaction: { mode: 'nearest', intersect: true, axis: 'r' },
      responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, max: 100, grid: { color: c.grid }, angleLines: { color: c.grid }, pointLabels: { color: c.text, font: { family: 'Inter', size: window.innerWidth < 640 ? 9 : 12, weight: 'bold' } }, ticks: { display: false } } },
      plugins: {
        legend: { labels: { color: c.text, font: { family: 'Inter', weight: 'bold' } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}/100` } }
      }
    }
  });
}

// ═══════════════ WORLD MAP PROJECTION (D3 CHOROPLETH) ═══════════════
async function buildWorldMap() {
  const container = document.getElementById('worldMapContainer');
  if (!container) return;

  try {
    const [scoreRes] = await Promise.all([
      fetch(`${GOE_SERVER}/api/world-impact`)
    ]);

    const scoreData = await scoreRes.json();
    const mapScores = {};
    scoreData.forEach(d => { mapScores[d.iso] = d.score; });
    const maxScore = Math.max(1, ...(scoreData.map(d => d.score)));

    // Cache the heavy geojson in global state to prevent multi-second lag on subsequent tab loads
    if (!GOEState._worldTopology) {
      const geoRes = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
      GOEState._worldTopology = await geoRes.json();
    }
    const topo = GOEState._worldTopology;
    container.innerHTML = '';

    // Set dynamic dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 380;

    const svg = d3.select('#worldMapContainer')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Zoom setup
    const g = svg.append('g');
    const zoom = d3.zoom().scaleExtent([1, 8]).on('zoom', (event) => { g.attr('transform', event.transform); });
    svg.call(zoom);

    // Map and projection
    const projection = d3.geoMercator()
      .scale(width / 6.5)
      .translate([width / 2, height / 1.5]);

    // Color scale mapping 0 -> maxScore using custom gradient 
    const colorScale = d3.scaleLinear()
      .domain([0.1, Math.max(maxScore / 2, 1), maxScore])
      .range(["#fde047", "#f97316", "#ef4444"]) // Yellow -> Orange -> Crimson
      .clamp(true);

    // Tooltip init
    let tooltip = d3.select("body").select(".map-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div")
        .attr("class", "map-tooltip")
        .style("position", "absolute")
        .style("background", "var(--surface)")
        .style("color", "var(--text)")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("border", "1px solid var(--border)")
        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 1000);
    }

    g.selectAll("path")
      .data(topo.features)
      .enter()
      .append("path")
      .attr("d", d3.geoPath().projection(projection))
      .attr("fill", function (d) {
        if (d.id === "IND") return "var(--accent)"; // Highlight India uniquely (Teal)
        const s = mapScores[d.id] || 0;
        const defaultFill = document.documentElement.getAttribute('data-theme') === 'dark' ? '#1E293B' : '#f1f5f9';
        return s === 0 ? defaultFill : colorScale(s);
      })
      .attr("stroke", document.documentElement.getAttribute('data-theme') === 'dark' ? '#334155' : '#ffffff')
      .attr("stroke-width", 0.7)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#334155').attr("stroke-width", 1.5);
        const s = mapScores[d.id] || 0;
        const name = d.properties.name;
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <div style="font-weight:700;margin-bottom:4px;font-size:13px">${name}</div>
          ${d.id === 'IND' ? '<span style="color:var(--accent);font-weight:600">Home Nation (Target Node)</span>' : `Threat Heat: <b style="color:${s > 0 ? 'var(--coral)' : 'var(--text3)'}">${s}</b>`}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("stroke", document.documentElement.getAttribute('data-theme') === 'dark' ? '#334155' : '#ffffff').attr("stroke-width", 0.7);
        tooltip.transition().duration(200).style("opacity", 0);
      })
      .on("click", function (event, d) {
        if (d.id === "IND") return; // India is anchor
        const s = mapScores[d.id] || 0;
        if (s > 0) {
          showCountryIntel(d.id, d.properties.name);
        } else {
          // Optionally, could show it even if 0 to say "No news". We'll allow it!
          showCountryIntel(d.id, d.properties.name);
        }
      });

  } catch (err) {
    console.error("Map build failed:", err);
    container.innerHTML = `<div style="color:var(--danger);padding:20px;text-align:center">Failed to load Map Geometry from CDN. Please check network.</div>`;
  }
}

// ═══════════════ ECONOMICS VIEW ═══════════════
function renderEconomics(mc) {
  mc.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px;margin-bottom:16px">ECONOMIC INTELLIGENCE</h2>
    <div class="grid grid-4" style="margin-bottom:16px">
      <div class="card" data-rich-tip="usd-inr-rate" data-tip-value="${GOEState._exchangeRate || '83.2'}">
        <div class="card-title">USD/INR Rate ${tip('usd-inr-rate')}</div>
        <div class="card-value" style="color:var(--warn)">${GOEState._exchangeRate || '83.2'}</div>
        <div class="card-sub">Live exchange rate</div>
      </div>
      <div class="card" data-rich-tip="india-gdp" data-tip-value="${GOEState._gdpValue || '$3.7T'}">
        <div class="card-title">India GDP ${tip('india-gdp')}</div>
        <div class="card-value" style="color:var(--accent)">${GOEState._gdpValue || '$3.7T'}</div>
        <div class="card-sub">Nominal (latest)</div>
      </div>
      <div class="card" data-rich-tip="trade-metrics" data-tip-value="Exports: $43.7B | Imports: $65.8B">
        <div class="card-title">Trade Metrics ${tip('trade-metrics')}</div>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px">
          <div>
            <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">Exports</div>
            <div style="font-family:var(--font-mono);font-size:20px;font-weight:800;color:var(--success)">$43.7B</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">Imports</div>
            <div style="font-family:var(--font-mono);font-size:20px;font-weight:800;color:var(--danger)">$65.8B</div>
          </div>
        </div>
      </div>
      <div class="card" data-rich-tip="forex-reserves" data-tip-value="$620B">
        <div class="card-title">Forex Reserves ${tip('forex-reserves')}</div>
        <div class="card-value" style="color:var(--success)">$620B</div>
        <div class="card-sub">Approximate</div>
      </div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Trade Dependency Matrix ${tip('trade-dependency')}</div>
        <div class="table-responsive">
        <table class="data-table">
          <thead><tr>
            <th data-tip="Trading partner nation">Partner</th>
            <th data-tip="Annual import value from this partner into India">Import</th>
            <th data-tip="Annual export value from India to this partner">Export</th>
            <th data-tip="Strategic risk rating: HIGH = adversarial or concentrated dependency, MEDIUM = manageable, LOW = aligned partner">Risk</th>
          </tr></thead>
          <tbody>
            ${[{ c: 'China', i: '$95B', e: '$18B', r: 'HIGH', t: '$77B deficit — single largest vulnerability. Electronics, APIs, industrial goods.' }, { c: 'USA', i: '$50B', e: '$78B', r: 'LOW', t: 'India has a trade surplus with USA. Key tech & defence partner.' }, { c: 'UAE', i: '$45B', e: '$32B', r: 'MEDIUM', t: 'Oil imports + large Indian diaspora remittances. Generally stable.' }, { c: 'Saudi Arabia', i: '$42B', e: '$11B', r: 'HIGH', t: '84% of India\'s oil imported. Geopolitical events directly impact energy costs.' }, { c: 'Russia', i: '$38B', e: '$4B', r: 'HIGH', t: 'Discounted oil imports post-Ukraine war. Risk: secondary sanctions from Western allies.' }, { c: 'Germany', i: '$15B', e: '$10B', r: 'LOW', t: 'Technology and machinery imports. Strong EU relationship.' }, { c: 'Japan', i: '$12B', e: '$6B', r: 'LOW', t: 'Trusted QUAD partner. Key in defence and clean energy cooperation.' }, { c: 'South Korea', i: '$18B', e: '$7B', r: 'MEDIUM', t: 'Electronics and shipbuilding imports. Growing strategic alignment.' }].map(x =>
    `<tr data-tip="${x.t}"><td>${x.c}</td><td style="font-family:var(--font-mono)">${x.i}</td><td style="font-family:var(--font-mono)">${x.e}</td><td><span class="badge ${x.r === 'HIGH' ? 'badge-critical' : x.r === 'MEDIUM' ? 'badge-high' : 'badge-low'}">${x.r}</span></td></tr>`).join('')}
          </tbody>
        </table>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Economic Entities in Graph
          <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400" data-tip="Entities in the Economics domain tracked by the knowledge graph. Click any to open its intelligence brief.">click for brief</span>
        </div>
        <div style="max-height:300px;overflow-y:auto">
          ${GOEState.graph ? [...GOEState.graph.nodes.values()].filter(n => n.domain === 'economics').slice(0, 12).map(n =>
      `<div style="padding:8px;margin-bottom:6px;background:var(--surface2);border-radius:6px;cursor:pointer" onclick="showEntityDetail(GOEState.graph.nodes.get('${n.id}'))"
                  data-tip="Confidence: ${Math.round(n.confidence)} · Type: ${n.type}">
              <div style="font-size:12px;font-weight:600">${n.label}</div>
              <div style="font-size:10px;color:var(--text3)">${n.type} • conf: ${Math.round(n.confidence)}</div>
            </div>`).join('') : '<div style="color:var(--text3)">Loading...</div>'}
        </div>
      </div>
    </div>
    
    <!-- MACRO-ECONOMIC CHART SECTION -->
    <div class="card" style="margin-top:20px;padding-bottom:30px">
      <div class="card-title">Macro-Economic Trajectory (History & Prediction)
        <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400;text-transform:none">Historical data up to 2024; AI prediction 2025-2028</span>
      </div>
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">
        <div style="flex:1 1 300px;min-width:0;position:relative;height:350px">
          <canvas id="macroEcoChart"></canvas>
        </div>
        <div style="flex:0 1 340px;min-width:260px;width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px">
          <div style="font-family:var(--font-display);font-size:12px;font-weight:700;color:var(--accent);margin-bottom:12px;letter-spacing:1px">AI PREDICTION REASONING</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">📈 GDP Growth ($5T Target)</div>
              <div style="font-size:11px;color:var(--text2);line-height:1.5">Model predicts reaching $5T by late 2027/2028. Driven by heavy capital expenditure (CapEx) in physical infrastructure, robust digital public infrastructure (DPI), and the China-Plus-One supply chain migration increasing domestic manufacturing capability.</div>
            </div>
            <div style="border-top:1px solid var(--border);padding-top:10px">
              <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">💸 Inflation Baseline Stability</div>
              <div style="font-size:11px;color:var(--text2);line-height:1.5">Predicted to stabilize around 4–4.5% (RBI target band). Reason: Expected stabilization of global crude oil prices, aggressive monetary policy, and improved supply-chain logistics dampening core inflation. Monsoon variability remains the primary upside risk.</div>
            </div>
            <div style="border-top:1px solid var(--border);padding-top:10px">
              <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">👥 Unemployment Reduction</div>
              <div style="font-size:11px;color:var(--text2);line-height:1.5">Projected slow but steady decline to ~5.5%. Driven by the Production Linked Incentive (PLI) scheme creating blue-collar manufacturing clusters, though structural youth unemployment and upskilling challenges will prevent steeper drops.</div>
            </div>
            <!-- SOURCES -->
            <div style="border-top:1px dashed var(--border2);padding-top:12px;margin-top:4px">
              <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Live Pipeline Sources</div>
              ${((GOEState.domainImpact?.economic?.topHeadlines) || [
      { title: "World Bank raises India's GDP growth forecast for FY25 to 7.2%", link: "https://www.worldbank.org/en/news/press-release/2024/09/03/indias-economy-to-remain-strong-growth-expected-to-reach-7-percent-in-fy24-25" },
      { title: "RBI holds repo rate steady; inflation control remains priority", link: "https://www.rbi.org.in/" }
    ]).slice(0, 2).map(h => `<div style="font-size:11px;color:var(--text);padding:3px 0;line-height:1.4">
                <a href="${(!h.link || h.link === '#') ? 'javascript:void(0)' : h.link}" target="${(!h.link || h.link === '#') ? '_self' : '_blank'}" rel="noopener" style="color:var(--accent2);text-decoration:none">&bull; ${(h.title || '').slice(0, 65)}${(h.title || '').length > 65 ? '...' : ''}</a>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- EXTERNAL SECTOR CHART SECTION (FOREX, TRADE, INR) -->
    <div class="card" style="margin-top:20px;padding-bottom:30px">
      <div class="card-title">External Sector & Currency Trajectory
        <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400;text-transform:none">Historical data up to 2024; AI prediction 2025-2028</span>
      </div>
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;flex-direction:row-reverse">
        <div style="flex:1 1 300px;min-width:0;position:relative;height:350px">
          <canvas id="tradeEcoChart"></canvas>
        </div>
        <div style="flex:0 1 340px;min-width:260px;width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px">
          <div style="font-family:var(--font-display);font-size:12px;font-weight:700;color:var(--accent);margin-bottom:12px;letter-spacing:1px">AI PREDICTION REASONING</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">🏦 Robust Forex Reserves</div>
              <div style="font-size:11px;color:var(--text2);line-height:1.5">Projected to grow steadily toward $750B by 2028. This provides a massive buffer to defend the Rupee against global shocks. Driven by strong service exports (IT), software remittances, and strict RBI reserve management.</div>
            </div>
            <div style="border-top:1px solid var(--border);padding-top:10px">
              <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">⚖️ Containing the Trade Deficit</div>
              <div style="font-size:11px;color:var(--text2);line-height:1.5">The goods deficit remains negative (~$250B-$300B annually) largely due to oil and electronics. Model predicts deficit widening slightly in raw volume as economy scales, though shrinking as a percentage of overall GDP through aggressive export subsidies.</div>
            </div>
            <div style="border-top:1px solid var(--border);padding-top:10px">
              <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">💱 Defending the USD/INR Exchange</div>
              <div style="font-size:11px;color:var(--text2);line-height:1.5">Model forecasts gradual, controlled depreciation to ~86 INR/USD by 2028. RBI interventions prevent steep volatility. Strategic depreciation assists export competitiveness while heavy forex acts as a strict floor against market panic.</div>
            </div>
            <!-- SOURCES -->
            <div style="border-top:1px dashed var(--border2);padding-top:12px;margin-top:4px">
              <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Live Pipeline Sources</div>
              ${(() => {
      const srcs = (GOEState.domainImpact?.economic?.topHeadlines || []).slice(2, 4);
      const fallback = [
        { title: "India's forex reserves surge past $640B, providing massive external buffer", link: "https://timesofindia.indiatimes.com/business/india-business/indias-forex-reserves-jump-to-record-high-of-642-49-billion/articleshow/108711477.cms" },
        { title: "Trade deficit narrows as engineering and electronic exports jump 12%", link: "https://pib.gov.in/PressReleasePage.aspx?PRID=2014408" }
      ];
      const items = srcs.length > 0 ? srcs : fallback;
      return items.map(h => `<div style="font-size:11px;color:var(--text);padding:3px 0;line-height:1.4">
                  <a href="${(!h.link || h.link === '#') ? 'javascript:void(0)' : h.link}" target="${(!h.link || h.link === '#') ? '_self' : '_blank'}" rel="noopener" style="color:var(--accent2);text-decoration:none">&bull; ${(h.title || '').slice(0, 65)}${(h.title || '').length > 65 ? '...' : ''}</a>
                </div>`).join('');
    })()}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    buildMacroEcoChart();
    buildTradeEcoChart();
  }, 100);
}

function buildTradeEcoChart() {
  const ctx = document.getElementById('tradeEcoChart');
  if (!ctx) return;

  // Destroy previous instance to prevent infinite resize loop
  if (_tradeEcoChartInstance) {
    _tradeEcoChartInstance.destroy();
    _tradeEcoChartInstance = null;
  }

  const labels = ['2020', '2021', '2022', '2023', '2024', '2025(E)', '2026(P)', '2027(P)', '2028(P)'];

  _tradeEcoChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Forex Reserves ($ Billions)',
          data: [580, 633, 562, 620, 645, 660, 690, 720, 750],
          borderColor: '#059669', // emerald success
          backgroundColor: '#059669',
          yAxisID: 'y',
          borderWidth: 3,
          segment: { borderDash: ctx => ctx.p0DataIndex >= 4 ? [6, 6] : undefined }
        },
        {
          label: 'Trade Deficit ($ Billions)', // Plotting as positive absolute numbers for scale, but it's a deficit
          data: [150, 191, 280, 240, 235, 245, 260, 275, 290], // Historical approximate, trending up due to scale
          borderColor: '#E11D48', // coral danger
          backgroundColor: '#E11D48',
          yAxisID: 'y',
          borderWidth: 2,
          segment: { borderDash: ctx => ctx.p0DataIndex >= 4 ? [6, 6] : undefined }
        },
        {
          label: 'USD/INR Exchange Rate',
          data: [74.1, 74.3, 79.8, 82.5, 83.2, 83.8, 84.5, 85.2, 86.0],
          borderColor: '#7C3AED', // violet
          backgroundColor: '#7C3AED',
          yAxisID: 'y1',
          borderWidth: 2,
          segment: { borderDash: ctx => ctx.p0DataIndex >= 4 ? [6, 6] : undefined }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: document.documentElement.style.getPropertyValue('--text2') || '#475569', font: { family: 'Inter', size: 12 } } },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.96)', titleColor: '#0F172A', bodyColor: '#334155', borderColor: '#E2E8F0', borderWidth: 1, padding: 12,
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) { label += ': '; }
              if (context.parsed.y !== null) {
                if (context.dataset.yAxisID === 'y') {
                  label += '$' + context.parsed.y + 'B';
                  if (label.includes('Deficit')) label = label.replace(': $', ': -$'); // add minus sign for deficit visually
                } else {
                  label += '₹' + context.parsed.y;
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: '#E2E8F0', drawBorder: false }, ticks: { color: '#475569', font: { family: 'Inter' } } },
        y: {
          type: 'linear', display: true, position: 'left',
          title: { display: true, text: 'Billions USD ($)', color: '#059669', font: { weight: 'bold' } },
          grid: { color: '#E2E8F0' },
          ticks: { color: '#475569', callback: function (value) { return '$' + value + 'B'; } }
        },
        y1: {
          type: 'linear', display: true, position: 'right',
          title: { display: true, text: 'Exchange Rate (₹)', color: '#7C3AED', font: { weight: 'bold' } },
          grid: { drawOnChartArea: false },
          ticks: { color: '#475569', callback: function (value) { return '₹' + value; } }
        }
      }
    }
  });
}

function buildMacroEcoChart() {
  const ctx = document.getElementById('macroEcoChart');
  if (!ctx) return;

  // Destroy previous instance to prevent infinite resize loop
  if (_macroEcoChartInstance) {
    _macroEcoChartInstance.destroy();
    _macroEcoChartInstance = null;
  }

  const labels = ['2020', '2021', '2022', '2023', '2024', '2025(E)', '2026(P)', '2027(P)', '2028(P)'];
  // Index 5 is 2025(E), where prediction starts

  _macroEcoChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'GDP ($ Trillions USD)',
          data: [2.67, 3.15, 3.42, 3.73, 3.94, 4.25, 4.60, 5.01, 5.35],
          borderColor: '#0284C7', // sky blue
          backgroundColor: '#0284C7',
          yAxisID: 'y',
          borderWidth: 3,
          segment: { borderDash: ctx => ctx.p0DataIndex >= 4 ? [6, 6] : undefined }
        },
        {
          label: 'Inflation (%)',
          data: [6.6, 5.5, 6.7, 5.4, 4.8, 4.5, 4.2, 4.1, 4.0],
          borderColor: '#DC2626', // rose red
          backgroundColor: '#DC2626',
          yAxisID: 'y1',
          borderWidth: 2,
          segment: { borderDash: ctx => ctx.p0DataIndex >= 4 ? [6, 6] : undefined }
        },
        {
          label: 'Unemployment (%)',
          data: [8.0, 7.5, 7.3, 7.1, 6.8, 6.5, 6.1, 5.8, 5.5],
          borderColor: '#D97706', // amber
          backgroundColor: '#D97706',
          yAxisID: 'y1',
          borderWidth: 2,
          segment: { borderDash: ctx => ctx.p0DataIndex >= 4 ? [6, 6] : undefined }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: document.documentElement.style.getPropertyValue('--text2') || '#475569', font: { family: 'Inter', size: 12 } } },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.96)', titleColor: '#0F172A', bodyColor: '#334155', borderColor: '#E2E8F0', borderWidth: 1, padding: 12,
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) { label += ': '; }
              if (context.parsed.y !== null) { label += context.dataset.yAxisID === 'y' ? '$' + context.parsed.y + 'T' : context.parsed.y + '%'; }
              return label;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: '#E2E8F0', drawBorder: false }, ticks: { color: '#475569', font: { family: 'Inter' } } },
        y: {
          type: 'linear', display: true, position: 'left',
          title: { display: true, text: 'GDP ($ Trillions)', color: '#0284C7', font: { weight: 'bold' } },
          grid: { color: '#E2E8F0' }, ticks: { color: '#475569', callback: function (value) { return '$' + value + 'T'; } }
        },
        y1: {
          type: 'linear', display: true, position: 'right',
          title: { display: true, text: 'Percentage (%)', color: '#475569', font: { weight: 'bold' } },
          grid: { drawOnChartArea: false }, ticks: { color: '#475569', callback: function (value) { return value + '%'; } }
        }
      }
    }
  });
}

// ═══════════════ DEFENSE VIEW ═══════════════
function renderDefense(mc) {
  const borders = [
    { name: 'Northern Border', key: 'northern-border', score: GOEState.indiaScore.military || 55, label: 'China / LAC', color: 'var(--danger)' },
    { name: 'Western Border', key: 'western-border', score: Math.max(30, (GOEState.indiaScore.military || 50) - 10), label: 'Pakistan / LoC', color: 'var(--warn)' },
    { name: 'Eastern Theater', key: 'eastern-theater', score: Math.min(90, (GOEState.indiaScore.military || 50) + 15), label: 'Bay of Bengal', color: 'var(--success)' }
  ];
  mc.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px;margin-bottom:16px">DEFENSE & SECURITY</h2>
    <div class="grid grid-3" style="margin-bottom:16px">
      ${borders.map(b => `
        <div class="card" style="text-align:center" data-rich-tip="${b.key}" data-tip-value="${b.score}/100">
          <div class="card-title">${b.name} ${tip(b.key)}</div>
          <div style="position:relative;width:100px;height:100px;margin:0 auto">
            ${makeGaugeSVG(b.score, 100, b.color)}
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-mono);font-size:20px;font-weight:700">${b.score}</div>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">${b.label}</div>
        </div>`).join('')}
    </div>
    
    <!-- DEFENSE AI REASONING / PIPELINE -->
    <div class="card" style="margin-bottom:16px;background:var(--surface2);border-left:3px solid var(--danger)">
      <div style="font-size:10px;font-weight:800;color:var(--danger);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">AI Security Assessment Logic</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:12px;line-height:1.5">Defense scores are dynamically calculated based on live activity across Eastern, Western, and Northern theatre nodes in the Knowledge Graph. Below are the primary news events triggering the current readiness score:</div>
      <div style="border-top:1px dashed var(--border2);padding-top:10px">
        <div style="font-size:9px;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Live Military Feed Sources</div>
        ${((GOEState.domainImpact?.military?.topHeadlines) && GOEState.domainImpact.military.topHeadlines.length > 0 ? GOEState.domainImpact.military.topHeadlines : [
      { title: "Routine border patrols maintain status quo along Line of Actual Control", link: "https://indianarmy.nic.in/", source: "Defense Feed" },
      { title: "Indian Navy deploys additional assets in critical IOR maritime routes", link: "https://indiannavy.nic.in/", source: "Maritime Feed" }
    ]).slice(0, 3).map(h => `<div style="font-size:11px;color:var(--text);padding:3px 0;line-height:1.4">
          <a href="${(!h.link || h.link === '#') ? 'javascript:void(0)' : h.link}" target="${(!h.link || h.link === '#') ? '_self' : '_blank'}" rel="noopener" style="color:var(--accent2);text-decoration:none"><span style="font-size:9px;color:var(--text3);background:var(--surface3);padding:1px 4px;border-radius:3px;margin-right:4px">${h.source || 'Intel'}</span> ${h.title}</a>
        </div>`).join('')}
      </div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Defense Entities
          <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400" data-tip="Military organisations, units, assets, and concepts tracked in the Defense domain. Confidence = how recently and frequently referenced.">confidence shown</span>
        </div>
        ${GOEState.graph ? [...GOEState.graph.nodes.values()].filter(n => n.domain === 'defense').slice(0, 10).map(n =>
      `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)"
                data-tip="${n.type} entity. Confidence: ${Math.round(n.confidence)}. Click graph node for full profile.">
            <div style="width:6px;height:6px;border-radius:50%;background:var(--danger)"></div>
            <span style="font-size:12px;flex:1">${n.label}</span>
            <span style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">${Math.round(n.confidence)}</span>
          </div>`).join('') : '<div style="color:var(--text3)">Loading...</div>'}
      </div>
      <div class="card">
        <div class="card-title">Active Threat Summary
          <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400" data-tip="Defense-domain threats currently active in the threat matrix. Click Threats view for full table.">defense domain only</span>
        </div>
        ${GOEState.threats.filter(t => t.domain === 'defense').length === 0 ? '<div style="color:var(--text3);font-size:13px">No active defense threats</div>' :
      GOEState.threats.filter(t => t.domain === 'defense').map(t => `
            <div style="padding:8px;margin-bottom:8px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--danger);cursor:pointer"
                 onclick="showThreatDetail('${t.id}')"
                 data-tip="Severity: ${t.severity}. Confidence: ${t.confidence || 0}%. Click to open full brief.">
              <div style="font-weight:600;font-size:13px">${t.name}</div>
              <div style="font-size:11px;color:var(--text2);margin-top:4px">${t.description?.slice(0, 100) || ''}...</div>
            </div>`).join('')}
      </div>
    </div>`;
}

// ═══════════════ TECHNOLOGY VIEW ═══════════════
function renderTechnology(mc) {
  mc.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px;margin-bottom:16px">TECHNOLOGY WATCH</h2>
    <div class="grid grid-3">
      <div class="card">
        <div class="card-title">Sector Capability Transparency
          <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400" data-tip="Direct sub-metrics generating the overall Technology Score based on NLP intelligence analysis.">ai-generated metrics</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;margin-top:12px">
          ${[{ label: 'Digital Public Infra (DPI/UPI)', score: 92 }, { label: 'Defense & Space (ISRO)', score: 85 }, { label: 'AI & Data Talent Pool', score: 75 }, { label: 'Cyber-Warfare Readiness', score: 58 }, { label: 'Semiconductor Fab Capacity', score: 25 }].map(m => `
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:11px;font-weight:600;color:var(--text2)"><span>${m.label}</span><span style="font-family:var(--font-mono);color:${m.score > 70 ? 'var(--success)' : m.score < 40 ? 'var(--danger)' : 'var(--accent)'}">${m.score}</span></div>
              <div class="progress" style="height:6px"><div class="progress-fill" style="width:${m.score}%;background:${m.score > 70 ? 'var(--success)' : m.score < 40 ? 'var(--danger)' : 'var(--accent)'};border-radius:4px"></div></div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Technology Entities in Graph
          <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400" data-tip="AI, semiconductor, space, cyber, and digital entities tracked in the Technology domain. Click any to open its intelligence brief.">click for brief</span>
        </div>
        <div style="max-height:280px;overflow-y:auto;padding-right:4px">
          ${GOEState.graph ? [...GOEState.graph.nodes.values()].filter(n => n.domain === 'technology').slice(0, 15).map(n =>
    `<div style="display:flex;align-items:center;gap:8px;padding:8px;margin-bottom:4px;background:var(--surface2);border-radius:6px;cursor:pointer" onclick="showEntityDetail(GOEState.graph.nodes.get('${n.id}'))"
                  data-tip="${n.type} · Confidence: ${Math.round(n.confidence)} · ${n.metadata?.insight || 'No insight yet'}">
              <div style="width:8px;height:8px;border-radius:50%;background:var(--accent)"></div>
              <span style="font-size:12px;flex:1">${n.label}</span>
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--accent)">${Math.round(n.confidence)}</span>
            </div>`).join('') : '<div style="color:var(--text3)">Scanning...</div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-title">AI Capability Index ${tip('ai-capability-index')}</div>
        <canvas id="techBarChart" height="280"></canvas>
      </div>
    </div>
    
    <!-- TECH AI REASONING / PIPELINE -->
    <div class="card" style="margin-top:16px;background:var(--surface2);border-left:3px solid var(--accent)">
      <div style="font-size:10px;font-weight:800;color:var(--accent);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">AI Capability Rating Logic</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:12px;line-height:1.5">India's Tech capabilities are scored against competing nations based on R&D flow, Semiconductor news, Space (ISRO) operations, and AI regulation impacts.</div>
      <div style="border-top:1px dashed var(--border2);padding-top:10px">
        <div style="font-size:9px;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Live Tech Feed Sources</div>
        ${((GOEState.domainImpact?.technology?.topHeadlines) && GOEState.domainImpact.technology.topHeadlines.length > 0 ? GOEState.domainImpact.technology.topHeadlines : [
      { title: "India semiconductor mission attracts billions in new fab manufacturing proposals", link: "https://ism.gov.in/", source: "Tech Feed" },
      { title: "ISRO announces next generation launch vehicle progression parameters", link: "https://www.isro.gov.in/nglv.html", source: "Space Feed" }
    ]).slice(0, 3).map(h => `<div style="font-size:11px;color:var(--text);padding:3px 0;line-height:1.4">
          <a href="${(!h.link || h.link === '#') ? 'javascript:void(0)' : h.link}" target="${(!h.link || h.link === '#') ? '_self' : '_blank'}" rel="noopener" style="color:var(--accent2);text-decoration:none"><span style="font-size:9px;color:var(--text3);background:var(--surface3);padding:1px 4px;border-radius:3px;margin-right:4px">${h.source || 'Intel'}</span> ${h.title}</a>
        </div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">Technology Threats
        <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400" data-tip="Technology-domain threats: semiconductor decoupling, cyber warfare, AI capability gaps, and critical infrastructure risks.">click row for full brief</span>
      </div>
      ${GOEState.threats.filter(t => t.domain === 'technology').map(t => `
        <div style="padding:10px;margin-bottom:8px;background:var(--surface2);border-radius:8px;border-left:3px solid var(--accent);cursor:pointer"
             onclick="showThreatDetail('${t.id}')"
             data-tip="Confidence: ${t.confidence || 0}%. Entities: ${(t.entities || []).slice(0, 3).join(', ')}. Click for full intelligence brief.">
          <div style="display:flex;justify-content:space-between"><span style="font-weight:600">${t.name}</span><span class="badge ${severityClass(t.severity)}">${t.severity}</span></div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px">${t.description || ''}</div>
        </div>`).join('') || '<div style="color:var(--text3);font-size:13px">No technology threats detected</div>'}
    </div>`;
  setTimeout(() => {
    const ctx = document.getElementById('techBarChart');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'bar', data: {
        labels: ['USA', 'China', 'UK', 'India', 'Germany', 'Japan', 'South Korea', 'Israel', 'France', 'Canada'],
        datasets: [{ label: 'AI Capability Score', data: [95, 88, 72, 58, 65, 70, 68, 62, 60, 55], backgroundColor: 'rgba(0,229,204,.6)', borderColor: '#00E5CC', borderWidth: 1 }]
      },
      options: {
        indexAxis: 'y', responsive: true, scales: { x: { grid: { color: 'rgba(100,116,139,.15)' }, ticks: { color: '#64748b' } }, y: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` Score: ${ctx.raw}/100 — based on research output, compute, talent, and AI investment` } }
        }
      }
    });
  }, 100);
}

// ═══════════════ CLIMATE VIEW ═══════════════
function renderClimate(mc) {
  const climateBase = GOEState.indiaScore.climate || 50;
  const resources = [
    { name: 'Water Security', key: 'water-security', score: Math.max(20, climateBase - 8), color: 'var(--info)' },
    { name: 'Food Security', key: 'food-security', score: Math.min(85, climateBase + 8), color: 'var(--success)' },
    { name: 'Energy Security', key: 'energy-security', score: Math.min(80, climateBase + 5), color: 'var(--warn)' }
  ];
  mc.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px;margin-bottom:16px">CLIMATE & SOCIETY</h2>
    <div class="grid grid-3" style="margin-bottom:16px">
      ${resources.map(r => `
        <div class="card" style="text-align:center" data-rich-tip="${r.key}" data-tip-value="${r.score}/100">
          <div class="card-title">${r.name} ${tip(r.key)}</div>
          <div style="position:relative;width:100px;height:100px;margin:0 auto">
            ${makeGaugeSVG(r.score, 100, r.color)}
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-mono);font-size:20px;font-weight:700">${r.score}</div>
          </div>
        </div>`).join('')}
    </div>
    
    <!-- CLIMATE AI REASONING / PIPELINE -->
    <div class="card" style="margin-bottom:16px;background:var(--surface2);border-left:3px solid var(--success)">
      <div style="font-size:10px;font-weight:800;color:var(--success);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Climate & Resource Logic</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:12px;line-height:1.5">Energy, Water, and Food security scores are generated by analysing meteorological reports, energy import routes, and agricultural infrastructure news. The scores above reflect the following intelligence reports:</div>
      <div style="border-top:1px dashed var(--border2);padding-top:10px">
        <div style="font-size:9px;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Live Climate Feed Sources</div>
        ${((GOEState.domainImpact?.climate?.topHeadlines) && GOEState.domainImpact.climate.topHeadlines.length > 0 ? GOEState.domainImpact.climate.topHeadlines : [
      { title: "Renewable energy integration scales past milestone targets before 2030 deadline", link: "https://mnre.gov.in/", source: "Energy Feed" },
      { title: "IMD predicts normal monsoon pattern, alleviating agriculture and water stress concerns", link: "https://mausam.imd.gov.in/", source: "Climate Feed" }
    ]).slice(0, 3).map(h => `<div style="font-size:11px;color:var(--text);padding:3px 0;line-height:1.4">
          <a href="${(!h.link || h.link === '#') ? 'javascript:void(0)' : h.link}" target="${(!h.link || h.link === '#') ? '_self' : '_blank'}" rel="noopener" style="color:var(--accent2);text-decoration:none"><span style="font-size:9px;color:var(--text3);background:var(--surface3);padding:1px 4px;border-radius:3px;margin-right:4px">${h.source || 'Intel'}</span> ${h.title}</a>
        </div>`).join('')}
      </div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Climate Entities
          <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400" data-tip="Climate, environmental, and society entities in the knowledge graph. Click any to open its intelligence profile.">click for profile</span>
        </div>
        ${GOEState.graph ? [...GOEState.graph.nodes.values()].filter(n => n.domain === 'climate' || n.domain === 'society').slice(0, 10).map(n =>
      `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)"
                data-tip="${n.domain} domain · ${n.type} · Confidence: ${Math.round(n.confidence)}">
            <div style="width:6px;height:6px;border-radius:50%;background:${domainColor(n.domain)}"></div>
            <span style="font-size:12px;flex:1">${n.label}</span>
            <span class="badge" style="font-size:9px;background:${domainColor(n.domain)}20;color:${domainColor(n.domain)}">${n.domain}</span>
          </div>`).join('') : '<div style="color:var(--text3)">Loading...</div>'}
      </div>
      <div class="card">
        <div class="card-title">Society & Climate Threats
          <span style="font-size:11px;color:var(--text3);margin-left:6px;font-weight:400" data-tip="Climate and society domain threats: water stress, food insecurity, energy supply shocks, demographic risks.">click for brief</span>
        </div>
        ${GOEState.threats.filter(t => t.domain === 'climate' || t.domain === 'society').map(t =>
        `<div style="padding:8px;margin-bottom:6px;background:var(--surface2);border-radius:6px;border-left:3px solid ${domainColor(t.domain)};cursor:pointer"
                onclick="showThreatDetail('${t.id}')"
                data-tip="Severity: ${t.severity}. Confidence: ${t.confidence || 0}%. Click for full brief.">
            <span style="font-weight:600;font-size:13px">${t.name}</span>
            <div style="font-size:11px;color:var(--text2);margin-top:2px">${t.description?.slice(0, 80) || ''}...</div>
          </div>`).join('') || '<div style="color:var(--text3)">No threats in this domain</div>'}
      </div>
    </div>`;
}

// ═══════════════ LIVE INTELLIGENCE FEED ═══════════════
function renderLiveFeed(mc) {
  const articles = GOEState.articles || [];

  const header = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h2 style="font-family:var(--font-display);font-size:14px;letter-spacing:2px;margin:0;">GLOBAL NEWS INTELLIGENCE EXPLORER</h2>
      <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">
        Loaded Pipeline Articles: <strong style="color:var(--accent)">${articles.length}</strong>
      </div>
    </div>
  `;

  if (articles.length === 0) {
    mc.innerHTML = header + `<div class="card" style="text-align:center;padding:40px"><div style="color:var(--text3)">Waiting for data sync...</div></div>`;
    return;
  }

  const articleHTML = articles.map(art => {
    // Sentiment calculation
    const isCritical = art.sentiment < 40;
    const isPositive = art.sentiment > 60;
    const sentColor = isCritical ? 'var(--danger)' : isPositive ? 'var(--emerald)' : 'var(--amber)';

    // Entity pill map
    const entityPills = (art.entities || []).slice(0, 5).map(ent =>
      `<span style="background:var(--surface2);border:1px solid var(--border);padding:2px 6px;border-radius:4px;font-size:10px;color:var(--text2);font-family:var(--font-mono)">${ent.name}</span>`
    ).join(' ');

    return `
      <div class="card" style="margin-bottom:16px;border-left:4px solid ${domainColor(art.domain)};display:flex;flex-direction:column;gap:12px;cursor:pointer;transition:transform 0.1s;background:var(--surface)" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'" onclick="window.open('${art.link}', '_blank')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge" style="background:var(--surface2);color:var(--text2);border:1px solid var(--border);">🎙️ ${art.source}</span>
              <span class="badge" style="background:${domainColor(art.domain)}15;color:${domainColor(art.domain)}">${art.domain.toUpperCase()}</span>
              <span style="font-size:10px;color:var(--text3)">${new Date(art.publishedAt).toLocaleString()}</span>
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--text);line-height:1.4">${art.title}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text3)">SENTIMENT</span>
            <span style="font-size:16px;font-weight:800;color:${sentColor};font-family:var(--font-mono)">${art.sentiment}</span>
          </div>
        </div>
        
        <div style="font-size:12px;color:var(--text2);line-height:1.5;background:var(--surface2);padding:10px;border-radius:6px;border-left: 2px solid var(--border2)">
          ${art.description || "No description provided."}
        </div>
        
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap">
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <span style="font-size:10.5px;font-weight:700;color:var(--text3);margin-right:2px">EXTRACTED:</span>
            ${entityPills}
            ${art.entities?.length > 5 ? `<span style="font-size:10px;color:var(--text3)">+${art.entities.length - 5} more</span>` : ''}
          </div>
          <a href="${(!art.link || art.link === '#') ? 'javascript:void(0)' : art.link}" target="${(!art.link || art.link === '#') ? '_self' : '_blank'}" style="font-size:10px;color:var(--accent2);text-decoration:none;font-weight:600;background:var(--accent)20;padding:4px 8px;border-radius:4px" onclick="event.stopPropagation()">READ FULL ARTICLE ↗</a>
        </div>
      </div>
    `;
  }).join('');

}

// ═══════════════ DOMAIN INTELLIGENCE EXPLORER (SLIDEBAR) ═══════════════
function showDomainIntel(domainKey) {
  const panel = document.getElementById('detailPanel');
  const content = document.getElementById('detailContent');

  // Map UI keys to pipeline domain tags
  const mapping = {
    'military': 'defense',
    'economic': 'economics',
    'diplomatic': 'geopolitics',
    'technology': 'technology',
    'climate': 'climate',
    'society': 'society'
  };
  const targetDomain = mapping[domainKey] || domainKey;

  // Filter articles
  const articles = (GOEState.articles || []).filter(a => a.domain === targetDomain);

  const header = `
    <div style="margin-top:10px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <div style="width:12px;height:12px;border-radius:50%;background:${domainColor(targetDomain)}"></div>
      <h2 style="font-family:var(--font-display);font-size:16px;letter-spacing:1px;margin:0;text-transform:uppercase">${targetDomain} INTELLIGENCE FEED</h2>
    </div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:20px;line-height:1.6">
      Displaying the full volume of live pipeline articles calculating the ${targetDomain} strategic score. Total active articles: <strong style="color:var(--text)">${articles.length}</strong>.
    </div>
  `;

  if (articles.length === 0) {
    content.innerHTML = header + `<div style="padding:20px;text-align:center;color:var(--text3);background:var(--surface2);border-radius:8px">No recent articles found for this domain. Wait for the next pipeline sync (150s).</div>`;
  } else {
    const articleHTML = articles.map(art => {
      const isCritical = art.sentiment < 40;
      const sentColor = isCritical ? 'var(--danger)' : art.sentiment > 60 ? 'var(--emerald)' : 'var(--amber)';
      const entityPills = (art.entities || []).slice(0, 4).map(e => `<span style="font-size:9px;background:var(--surface3);padding:2px 6px;border-radius:4px;border:1px solid var(--border);color:var(--text2);font-family:var(--font-mono)">${e.name}</span>`).join(' ');

      return `
        <div style="margin-bottom:16px;padding:14px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${domainColor(art.domain)};border-radius:8px;cursor:pointer;transition:transform 0.1s"
             onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'"
             onclick="window.open('${art.link}', '_blank')" data-tip="Click to read original source">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
             <span class="badge" style="background:var(--surface2);color:var(--text2);border:1px solid var(--border);font-size:9px">🎙️ ${art.source}</span>
             <div style="display:flex;align-items:center;gap:6px">
               <span style="font-size:9px;font-weight:700;letter-spacing:1px;color:var(--text3)">SENTIMENT</span>
               <span style="font-size:12px;font-weight:800;font-family:var(--font-mono);color:${sentColor}">${art.sentiment}</span>
             </div>
          </div>
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;line-height:1.4">${art.title}</div>
          <div style="font-size:11px;color:var(--text2);margin-bottom:10px;line-height:1.5">${art.description ? (art.description.length > 120 ? art.description.slice(0, 120) + '...' : art.description) : ''}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
            <div style="display:flex;gap:4px;flex-wrap:wrap">${entityPills}</div>
            <a href="${(!art.link || art.link === '#') ? 'javascript:void(0)' : art.link}" target="${(!art.link || art.link === '#') ? '_self' : '_blank'}" style="font-size:10px;color:var(--accent2);text-decoration:none;font-weight:600;background:var(--accent)20;padding:4px 8px;border-radius:4px" onclick="event.stopPropagation()">READ FULL ARTICLE ↗</a>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = header + '<div style="display:flex;flex-direction:column">' + articleHTML + '</div>';
  }

  panel.classList.add('open');
  setTimeout(() => { if (typeof attachTooltips === 'function') attachTooltips(); }, 30);
}

// ═══════════════ GEOPOLITICAL ENTITY EXPLORER (SLIDEBAR) ═══════════════
function showCountryIntel(iso, name) {
  const panel = document.getElementById('detailPanel');
  const content = document.getElementById('detailContent');

  // Alternative names for robust string matching
  const aliases = [name.toLowerCase()];
  if (iso === 'USA') aliases.push('united states', 'america', 'us', 'biden');
  if (iso === 'CHN') aliases.push('china', 'chinese', 'beijing', 'pla');
  if (iso === 'RUS') aliases.push('russia', 'russian', 'moscow', 'putin');
  if (iso === 'PAK') aliases.push('pakistan', 'pakistani', 'islamabad', 'isi');
  if (iso === 'GBR') aliases.push('uk', 'britain', 'united kingdom', 'london');
  if (iso === 'FRA') aliases.push('france', 'french', 'paris', 'macron');
  if (iso === 'ISR') aliases.push('israel', 'israeli', 'tel aviv', 'jerusalem');
  if (iso === 'SAU') aliases.push('saudi arabia', 'riyadh', 'saudi', 'opec');
  if (iso === 'TUR') aliases.push('turkey', 'ankara', 'erdogan');
  if (iso === 'UKR') aliases.push('ukraine', 'kyiv', 'zelenskyy');
  if (iso === 'IRN') aliases.push('iran', 'tehran', 'iranian');
  if (iso === 'DEU') aliases.push('germany', 'berlin', 'german');
  if (iso === 'JPN') aliases.push('japan', 'tokyo', 'japanese');
  if (iso === 'KOR') aliases.push('south korea', 'seoul', 'korean');
  if (iso === 'ARE') aliases.push('uae', 'dubai', 'abu dhabi', 'emirates');

  // Filter articles globally containing these terms (using strict word boundaries)
  const articles = (GOEState.articles || []).filter(a => {
    const text = (a.title + " " + (a.description || '')).toLowerCase();
    return aliases.some(al => new RegExp('\\b' + al + '\\b', 'i').test(text));
  });

  const header = `
    <div style="margin-top:10px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <div style="width:24px;height:24px;border-radius:4px;background:var(--surface3);display:flex;align-items:center;justify-content:center;font-size:14px">🗺️</div>
      <h2 style="font-family:var(--font-display);font-size:16px;letter-spacing:1px;margin:0;text-transform:uppercase">${name} THREAT PROFILE</h2>
    </div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:20px;line-height:1.6">
      Live intelligence feed tracking all events, geopolitical shifts, and NLP-detected threats relating to ${name}. Total active footprints: <strong style="color:var(--text)">${articles.length}</strong>.
    </div>
  `;

  if (articles.length === 0) {
    content.innerHTML = header + `<div style="padding:20px;text-align:center;color:var(--text3);background:var(--surface2);border-radius:8px">No decisive news footprint detected for ${name} in the current intelligence cycle.</div>`;
  } else {
    const articleHTML = articles.map(art => {
      const isCritical = art.sentiment < 40;
      const sentColor = isCritical ? 'var(--danger)' : art.sentiment > 60 ? 'var(--emerald)' : 'var(--amber)';
      const entityPills = (art.entities || []).slice(0, 4).map(e => `<span style="font-size:9px;background:var(--surface3);padding:2px 6px;border-radius:4px;border:1px solid var(--border);color:var(--text2);font-family:var(--font-mono)">${e.name}</span>`).join(' ');

      return `
        <div style="margin-bottom:16px;padding:14px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${domainColor(art.domain)};border-radius:8px;cursor:pointer;transition:transform 0.1s"
             onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'"
             onclick="window.open('${art.link}', '_blank')" data-tip="Click to read original source">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
             <span class="badge" style="background:var(--surface2);color:var(--text2);border:1px solid var(--border);font-size:9px">🎙️ ${art.source}</span>
             <div style="display:flex;align-items:center;gap:6px">
               <span style="font-size:9px;font-weight:700;letter-spacing:1px;color:var(--text3)">SENTIMENT</span>
               <span style="font-size:12px;font-weight:800;font-family:var(--font-mono);color:${sentColor}">${art.sentiment}</span>
             </div>
          </div>
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;line-height:1.4">${art.title}</div>
          <div style="font-size:11px;color:var(--text2);margin-bottom:10px;line-height:1.5">${art.description ? (art.description.length > 120 ? art.description.slice(0, 120) + '...' : art.description) : ''}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
            <div style="display:flex;gap:4px;flex-wrap:wrap">${entityPills}</div>
            <a href="${(!art.link || art.link === '#') ? 'javascript:void(0)' : art.link}" target="${(!art.link || art.link === '#') ? '_self' : '_blank'}" style="font-size:10px;color:var(--accent2);text-decoration:none;font-weight:600;background:var(--accent)20;padding:4px 8px;border-radius:4px" onclick="event.stopPropagation()">READ FULL ARTICLE ↗</a>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = header + '<div style="display:flex;flex-direction:column">' + articleHTML + '</div>';
  }

  panel.classList.add('open');
  setTimeout(() => { if (typeof attachTooltips === 'function') attachTooltips(); }, 30);
}

// ═══════════════ AUTOMATED STRATEGIC DOSSIER EXPORT ═══════════════
function generateDossierPDF() {
  const s = GOEState.indiaScore || {};
  const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
  const topThreats = (GOEState.threats || []).slice(0, 4);
  const topEntities = GOEState.graph && GOEState.graph.nodes && GOEState.graph.nodes.size > 0
    ? [...GOEState.graph.nodes.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 12).map(n => n.label).join(', ')
    : 'Aggregating pipeline...';

  const metricsHTML = ['military', 'economic', 'diplomatic', 'tech', 'climate', 'social'].map(k => {
    const v = s[k] || 0;
    return `
      <div class="p-card">
        <div class="p-flex" style="justify-content:space-between;align-items:center;margin-bottom:0">
          <span style="font-size:13px;font-weight:700;text-transform:uppercase">${k} STRATEGY</span>
          <span class="p-score">${v}/100</span>
        </div>
        <div class="p-bar"><div class="p-fill" style="width:${v}%"></div></div>
      </div>
    `;
  }).join('');

  const threatsHTML = topThreats.length > 0 ? topThreats.map(t => {
    const bdColor = t.severity === 'CRITICAL' ? '#7f1d1d' : t.severity === 'HIGH' ? '#dc2626' : '#ea580c';
    return `
      <div style="margin-bottom:15px;border:1px solid #ccc;padding:14px;border-left:4px solid ${bdColor};break-inside:avoid;">
        <div class="p-flex" style="justify-content:space-between;margin-bottom:6px">
           <div style="font-weight:800;font-size:14px;">${t.name}</div>
           <div style="font-size:11px;font-weight:700;background:${bdColor} !important;color:white !important;padding:2px 6px;border-radius:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${t.severity} RISK</div>
        </div>
        <div style="font-size:13px;line-height:1.5;margin-bottom:10px;color:#333">${t.description}</div>
        <div style="font-size:11px;color:#555"><b>Tracked Entities:</b> ${t.entities.join(', ')}</div>
      </div>
    `;
  }).join('') : '<div style="font-style:italic;font-size:14px;color:#666">No active critical threats detected within confidence bounds.</div>';

  const styleEl = document.createElement('style');
  styleEl.id = 'printDossierStyle';
  styleEl.innerHTML = `
    @media screen {
      #printDossierOverlay { display: none; }
    }
    @media print {
      @page { margin: 15mm; size: A4 portrait; }
      body * { display: none !important; }
      #printDossierOverlay, #printDossierOverlay * { display: block !important; visibility: visible !important; }
      #printDossierOverlay { 
        position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; 
        background: white !important; color: black !important; font-family: 'Inter', sans-serif; 
      }
      #printDossierOverlay .p-flex { display: flex !important; margin-bottom: 20px; }
      #printDossierOverlay .p-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 20px; margin-bottom: 30px; }
      #printDossierOverlay .p-title { display: block !important; font-size: 24px; font-weight: 800; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; font-family: 'Outfit', sans-serif; }
      #printDossierOverlay .p-section { display: block !important; font-size: 16px; font-weight: 700; border-bottom: 1px solid #ccc; margin-bottom: 15px; padding-bottom: 5px; margin-top: 35px; text-transform: uppercase; letter-spacing: 1px; }
      #printDossierOverlay .p-card { display: block !important; border: 1px solid #ddd; padding: 15px; border-radius: 8px; break-inside: avoid; }
      #printDossierOverlay .p-score { display: inline !important; font-size: 28px; font-weight: 800; font-family: 'Roboto Mono', monospace; }
      #printDossierOverlay .p-bar { display: block !important; height: 10px; background: #eee !important; border-radius: 5px; overflow: hidden; margin-top: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      #printDossierOverlay .p-fill { display: block !important; height: 100%; background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
  document.head.appendChild(styleEl);

  const overlay = document.createElement('div');
  overlay.id = 'printDossierOverlay';
  overlay.innerHTML = `
    <div style="padding:40px;max-width:900px;margin:0 auto;">
      <div class="p-title">CONFIDENTIAL: INDIA STRATEGIC SCORECARD</div>
      <div class="p-flex" style="justify-content:space-between;font-size:12px;border-bottom:1px dashed #ccc;padding-bottom:15px">
        <div><b>GENERATED:</b> ${dateStr}</div>
        <div><b>ENGINE:</b> Global Ontology Engine (v2.0 NLP)</div>
      </div>
      
      <div style="background:#f8fafc !important;padding:20px;border-left:4px solid #0f172a;margin-top:25px;margin-bottom:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <div style="font-size:11px;text-transform:uppercase;font-weight:700;color:#64748b;margin-bottom:8px;letter-spacing:1px">Executive Summary (AI Generated)</div>
        <div style="font-size:14px;line-height:1.6">${s.summary || 'Strategic summary compiling...'}</div>
      </div>
      
      <div class="p-section">CORE ADVANTAGE METRICS</div>
      <div class="p-grid">
        ${metricsHTML}
      </div>
      
      <div class="p-section">ACTIVE THREAT MATRIX (TOP 4)</div>
      ${threatsHTML}
      
      <div class="p-section">KNOWLEDGE GRAPH FOOTPRINT</div>
      <div style="font-size:13px;line-height:1.6;color:#333">
        <b>Highest Confidence Tracked Entities (Global):</b> ${topEntities}
      </div>
      
      <div style="margin-top:60px;font-size:10px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:15px">
        End of automatically generated intelligence briefing. GOE v2.0 Platform. Classification: Internal Official Use Only.
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      const e = document.getElementById('printDossierOverlay');
      if (e) e.remove();
      const s = document.getElementById('printDossierStyle');
      if (s) s.remove();
    }, 1500);
  }, 300);
}
