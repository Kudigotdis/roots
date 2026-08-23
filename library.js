/* ============================================================
   ROOTS LIBRARY — standalone cultural library engine
   Included by library.html. Data comes from lookups.js +
   customary.js globals. Owned by: Library dev.
   ============================================================ */
(function(){
'use strict';

function $(id){ return document.getElementById(id); }

function playPraiseAudio(totemKey){
  var unlocks = (window.RootsStore.read().unlocks) || {};
  if (!unlocks.audioLibrary) {
    window.RootsShell.toast("\uD83D\uDD12 Audio Library requires EcoCash verification ($10/yr). Go to Home \u2192 Settings.");
    return;
  }
  var entry = totemRegistry[totemKey];
  if (!entry) { window.RootsShell.toast("No praise data for this totem"); return; }
  var praises = (entry.zvidawo||entry.izithakazelo||[]);
  var text = praises.length ? praises.join(", ") : entry.greeting || totemKey;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.85;
    utter.onend = function(){ window.RootsShell.toast("\uD83D\uDD0A Playback finished"); };
    window.speechSynthesis.speak(utter);
    window.RootsShell.toast("\uD83D\uDD0A Playing praise: " + text.substring(0,40) + "\u2026");
  } else {
    window.RootsShell.toast("\u274C Text-to-speech not available on this device");
  }
}
  /* ============================================================
     CULTURAL LOOKUP LIBRARY (Section 3.3)
     ============================================================ */
  function renderLibraryTab(tab){
    var body = $('libraryBody');
    if (!body) return;
    body.innerHTML = '';
    switch(tab){
      case 'totems': renderLibraryTotems(body); break;
      case 'proverbs': renderLibraryProverbs(body); break;
      case 'greetings': renderLibraryGreetings(body); break;
      case 'poems': renderLibraryPoems(body); break;
      case 'regions': renderLibraryRegions(body); break;
      case 'glossary': renderLibraryGlossary(body); break;
      case 'shonaRoora': renderShonaRoora(body); break;
      case 'ndebeleRoora': renderNdebeleRoora(body); break;
    }
  }

  function renderRooraBack(body){
    var btn = document.createElement('button');
    btn.className = 'roora-back';
    btn.textContent = '\u2190 Back to Totems';
    btn.addEventListener('click', function(){
      document.querySelectorAll('.lib-tab').forEach(function(t){ t.classList.remove('active'); });
      document.querySelector('.lib-tab[data-libtab="totems"]').classList.add('active');
      renderLibraryTab('totems');
    });
    body.appendChild(btn);
  }

  function renderShonaRoora(body){
    var h = document.createElement('div');
    h.className = 'roora-header';
    h.innerHTML = '<div class="roora-eyebrow">Customary Marriage Process</div>' +
      '<h3>Shona Roora Process</h3>' +
      '<p>A structured summary of the Shona bridewealth negotiation process, financial stages, and customary protections.</p>';
    body.appendChild(h);

    var overview = document.createElement('div');
    overview.className = 'roora-section';
    overview.innerHTML = '<h4>Overview</h4>' +
      '<p>The confusion during Shona marriage negotiations often stems from two issues: families mixing the chronological order of steps, or failing to separate what belongs to the mother and what belongs to the father.</p>' +
      '<div class="roora-good"><strong>Key principle:</strong> The groom never speaks directly in the main negotiation; the Munyai (the go-between) handles the process and the money.</div>';
    body.appendChild(overview);

    var players = document.createElement('div');
    players.className = 'roora-section';
    players.innerHTML = '<h4>Key Players</h4>' +
      '<ul class="roora-ul">' +
        '<li><strong>Munyai</strong> \u2014 The most important negotiator. Speaks for the groom, handles all protocol and money.</li>' +
        '<li><strong>Vatete</strong> \u2014 Represents the bride and protects her interests.</li>' +
        '<li><strong>Groomsmen / Delegation</strong> \u2014 Sit quietly, speak only when called upon.</li>' +
        '<li><strong>In-laws</strong> \u2014 Parents and elders receive formal requests and ritual obligations.</li>' +
      '</ul>';
    body.appendChild(players);

    var steps = document.createElement('div');
    steps.className = 'roora-section';
    steps.innerHTML = '<h4>Chronological Step-by-Step Process</h4>';
    var stepsData = [
      { n:'1', t:'Vhuramuromo', d:'Weeks before, the groom\u2019s side sends a formal letter and a small fee called Vhuramuromo (\u201Cmouth opener\u201D).' },
      { n:'2', t:'Zvireverere / Mako', d:'On the morning of the Roora, the family pays incremental fees to acknowledge the in-laws and enter the homestead.' },
      { n:'3', t:'Zvinoreva Mai', d:'Payment strictly reserved for the mother to honor her role in raising the bride.' },
      { n:'4', t:'Zvinoreva Baba', d:'Payments to the father-in-law acknowledging his authority and upbringing of the bride.' },
      { n:'5', t:'Rusambo / Roora', d:'The core bride price that validates the union. The main financial and legal marker of marriage.' },
      { n:'6', t:'Numbi dzaMai / Danga', d:'Final clothing, gifts, and cattle/livestock value are finalized.' }
    ];
    var stepsGrid = document.createElement('div');
    stepsGrid.className = 'roora-steps';
    stepsData.forEach(function(s){
      var card = document.createElement('div');
      card.className = 'roora-step';
      card.innerHTML = '<div class="roora-step-num">' + s.n + '</div><h5>' + s.t + '</h5><p>' + s.d + '</p>';
      stepsGrid.appendChild(card);
    });
    steps.appendChild(stepsGrid);
    body.appendChild(steps);

    var ledger = document.createElement('div');
    ledger.className = 'roora-section';
    ledger.innerHTML = '<h4>Financial Ledger & Pricing Matrix</h4>' +
      '<div class="roora-table-wrap"><table class="roora-table">' +
      '<thead><tr><th>Item</th><th>Recipient</th><th>Purpose</th><th>Range</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Vhuramuromo</td><td>Bride\u2019s brothers / youth</td><td>Opens the talks</td><td>$20\u2013$100</td></tr>' +
        '<tr><td>Kupinda Mumusha</td><td>Household</td><td>Entry fee</td><td>$20\u2013$50</td></tr>' +
        '<tr><td>Mbonano yeAmbuya</td><td>Mother</td><td>Mother greeting token</td><td>$100\u2013$300</td></tr>' +
        '<tr><td>Pasi weMhazi</td><td>Father\u2019s lineage</td><td>Respect to ancestors</td><td>$50\u2013$100</td></tr>' +
        '<tr><td>Rusambo</td><td>Father / Tezvara</td><td>Core bride price</td><td>$1,500\u2013$5,000+</td></tr>' +
        '<tr><td>Danga (Cattle)</td><td>Father / family herd</td><td>Lineage wealth</td><td>4\u20138 cows</td></tr>' +
        '<tr><td>Mombe yeHumai</td><td>Mother</td><td>Mandatory live cow</td><td>1 heifer</td></tr>' +
        '<tr><td>Majuzi / Mbatya</td><td>Father and mother</td><td>Formal clothing</td><td>$300\u2013$600</td></tr>' +
        '<tr><td>Kunhonga</td><td>Bride</td><td>Consent cash</td><td>$50\u2013$200</td></tr>' +
      '</tbody></table></div>';
    body.appendChild(ledger);

    var nuances = document.createElement('div');
    nuances.className = 'roora-section';
    nuances.innerHTML = '<h4>Customary Nuances and Rules</h4>' +
      '<div class="roora-callout"><strong>Mombe yeHumai Rule:</strong> The mother\u2019s cow belongs exclusively to the mother\u2019s maternal ancestors. If the couple divorces, it cannot be refunded.</div>' +
      '<ul class="roora-ul">' +
        '<li><strong>Zvirehwa:</strong> Fines for protocol breaches (late arrival, speaking without Munyai, wrong door).</li>' +
        '<li><strong>Manyika / Ndau variations:</strong> Some regions emphasize salt, firewood, or beadwork.</li>' +
        '<li><strong>Order matters:</strong> Out-of-sequence stages can attract penalties and invalidate the contract.</li>' +
      '</ul>';
    body.appendChild(nuances);

    var divorce = document.createElement('div');
    divorce.className = 'roora-section';
    divorce.innerHTML = '<h4>Marriage Dissolution (Gupuro)</h4>' +
      '<div class="roora-code">[Gupuro (Shona)]\nHusband/Wife \u2192 Gives small physical token \u2192 Handed via Munyai to in-laws \u2192 Marriage void\n(Reason must be stated clearly)</div>' +
      '<ul class="roora-ul">' +
        '<li><strong>Gupuro:</strong> A token of rejection issued via Munyai or Vatete to the in-laws.</li>' +
        '<li><strong>Without Gupuro:</strong> Separation is not recognized under customary law.</li>' +
        '<li>The mother\u2019s cow remains protected and cannot be reclaimed.</li>' +
      '</ul>';
    body.appendChild(divorce);

    var custody = document.createElement('div');
    custody.className = 'roora-section';
    custody.innerHTML = '<h4>Child Custody and Family Rights</h4>' +
      '<ul class="roora-ul">' +
        '<li>Both traditions place children in the father\u2019s patrilineage once obligations are met.</li>' +
        '<li>During early childhood, the mother often retains primary physical custody.</li>' +
        '<li>If Roora was never paid, the maternal lineage retains stronger customary rights.</li>' +
      '</ul>';
    body.appendChild(custody);

    var masungiro = document.createElement('div');
    masungiro.className = 'roora-section';
    masungiro.innerHTML = '<h4>Masungiro / Pregnancy Protection Rite</h4>' +
      '<div class="roora-code">[Pregnancy Confirmed (7th\u20138th month)]\n  \u2193\nMother returns to maiden homestead\n  \u2193\nCeremonial handover and rituals\n  \u2193\nBirth and postnatal care\n  \u2193\nReturn to husband\u2019s home with newborn</div>' +
      '<p>Includes presentation of goats: <em>Mbudzi yeMasungiro</em> and <em>Mbudzi yechidandaro</em>.</p>';
    body.appendChild(masungiro);

    renderRooraBack(body);
  }

  function renderNdebeleRoora(body){
    var h = document.createElement('div');
    h.className = 'roora-header';
    h.innerHTML = '<div class="roora-eyebrow">Customary Marriage Framework</div>' +
      '<h3>Shona & Ndebele Roora Process</h3>' +
      '<p>A combined summary of the Shona Roora and Ndebele Amalobolo structures, negotiation phases, cattle ledger logic, and customary protections.</p>';
    body.appendChild(h);

    var shared = document.createElement('div');
    shared.className = 'roora-section';
    shared.innerHTML = '<h4>Shared Foundation</h4>' +
      '<p>Both traditions are structured, rule-based, and sensitive to family hierarchy. They depend on social mediation, proper sequencing, and recognition of maternal and paternal rights.</p>';
    body.appendChild(shared);

    var shona = document.createElement('div');
    shona.className = 'roora-section';
    shona.innerHTML = '<h4>Shona Roora Process</h4>';
    var shonaSteps = [
      { n:'1', t:'Vhuramuromo', d:'\u201COpening of the mouth.\u201D Formal letter and fee to open negotiations.' },
      { n:'2', t:'Zvireverere / Mako', d:'Greeting and entry fees to acknowledge in-laws.' },
      { n:'3', t:'Zvinoreva Mai', d:'Payments for the mother to honor her role.' },
      { n:'4', t:'Zvinoreva Baba', d:'Payments for the father-in-law\u2019s authority.' },
      { n:'5', t:'Rusambo / Roora', d:'Core bride price; marriage validity marker.' },
      { n:'6', t:'Numbi dzaMai / Danga', d:'Final clothing, gifts, and cattle value.' }
    ];
    var shonaGrid = document.createElement('div');
    shonaGrid.className = 'roora-steps';
    shonaSteps.forEach(function(s){
      var card = document.createElement('div');
      card.className = 'roora-step';
      card.innerHTML = '<div class="roora-step-num">' + s.n + '</div><h5>' + s.t + '</h5><p>' + s.d + '</p>';
      shonaGrid.appendChild(card);
    });
    shona.appendChild(shonaGrid);
    shona.innerHTML += '<div class="roora-callout">The groom\u2019s family is represented by the Munyai. The groom never directly carries the central bargaining role.</div>';
    body.appendChild(shona);

    var shonaTable = document.createElement('div');
    shonaTable.className = 'roora-section';
    shonaTable.innerHTML = '<h4>Shona Financial Ledger</h4>' +
      '<div class="roora-table-wrap"><table class="roora-table">' +
      '<thead><tr><th>Item</th><th>Recipient</th><th>Meaning</th><th>Range</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Vhuramuromo</td><td>Bride\u2019s brothers</td><td>Opening fee</td><td>$20\u2013$100</td></tr>' +
        '<tr><td>Kupinda Mumusha</td><td>Household</td><td>Entry fee</td><td>$20\u2013$50</td></tr>' +
        '<tr><td>Mbonano yeAmbuya</td><td>Mother</td><td>Token acknowledging mother</td><td>$100\u2013$300</td></tr>' +
        '<tr><td>Rusambo</td><td>Father / Tezvara</td><td>Core bride price</td><td>$1,500\u2013$5,000+</td></tr>' +
        '<tr><td>Danga / Cattle</td><td>Father / family herd</td><td>Livestock or cash equivalent</td><td>4\u20138 cows</td></tr>' +
        '<tr><td>Mombe yeHumai</td><td>Mother</td><td>Mandatory live cow</td><td>1 heifer</td></tr>' +
      '</tbody></table></div>';
    body.appendChild(shonaTable);

    var ndebele = document.createElement('div');
    ndebele.className = 'roora-section';
    ndebele.innerHTML = '<h4>Ndebele Amalobolo & Ikhazi Structure</h4>' +
      '<ul class="roora-ul">' +
        '<li><strong>Isivulamlomo</strong> \u2014 Token paid to open negotiations (equivalent to Vhuramuromo).</li>' +
        '<li><strong>Ikhazi</strong> \u2014 Primary cattle ledger and value structure.</li>' +
        '<li><strong>Inkomo kaBaba</strong> \u2014 Main herd dedicated to the bride\u2019s father.</li>' +
        '<li><strong>Inkomo kaMama</strong> \u2014 Specific cow for the bride\u2019s mother; cannot be reclaimed.</li>' +
        '<li><strong>Amasiko & Izibhula</strong> \u2014 Protocol items and gifts for brothers and uncles.</li>' +
        '<li><strong>Umalume Veto</strong> \u2014 The maternal uncle has formal veto authority over the process.</li>' +
      '</ul>' +
      '<div class="roora-good">The strongest structural difference: in Ndebele custom, the maternal uncle holds more direct power in the formal approval process.</div>';
    body.appendChild(ndebele);

    var umalume = document.createElement('div');
    umalume.className = 'roora-section';
    umalume.innerHTML = '<h4>Umalume Veto Power</h4>' +
      '<ul class="roora-ul">' +
        '<li>The Umalume (maternal uncle) represents maternal ancestors and has major veto authority.</li>' +
        '<li>He can halt negotiations if dissatisfied with the groom\u2019s lineage or unpaid obligations.</li>' +
        '<li>A specific share (Inkomo kaMalume) must be assigned to guarantee consent.</li>' +
      '</ul>';
    body.appendChild(umalume);

    var ledger = document.createElement('div');
    ledger.className = 'roora-section';
    ledger.innerHTML = '<h4>Cattle Ledger Detail</h4>' +
      '<div class="roora-code">CATTLE LEDGER BALANCE (Example Accounting)\n' +
      '=====================================================\n' +
      'Total Required Herd (Danga / Ikhazi): 8 Head\n' +
      '-----------------------------------------------------\n' +
      '1. Inkomo kaBaba (Father\u2019s Bull)     : 1 Paid\n' +
      '2. Inkomo yohlanga (Mother\u2019s Cow)     : 1 Paid\n' +
      '3. Inkomo kaMalume (Uncle\u2019s Cow)      : 1 Pending\n' +
      '4. Danga (Remaining Herd)               : 5 Pending\n' +
      '-----------------------------------------------------\n' +
      'Value Per Head: $300\u2013$500/head\n' +
      'Cash Settled: $600 (2 Head) | Outstanding: 6 Head\n' +
      '=====================================================</div>' +
      '<ul class="roora-ul">' +
        '<li><strong>Mombe yeMbereko:</strong> Live cow for the mother; cannot be slaughtered without her permission.</li>' +
        '<li><strong>Mombe yeDanga:</strong> Livestock for the father to build the family kraal.</li>' +
        '<li><strong>Cash indexing:</strong> Beasts can be converted to cash for partial payment tracking.</li>' +
      '</ul>';
    body.appendChild(ledger);

    var divorce = document.createElement('div');
    divorce.className = 'roora-section';
    divorce.innerHTML = '<h4>Divorce Protocols</h4>' +
      '<div class="roora-code">[Gupuro (Shona)]\nHusband/Wife \u2192 gives token \u2192 handed via Munyai \u2192 marriage void\n\n[Ukuxoshwa / Ukudiliza (Ndebele)]\nHusband/Wife \u2192 returns goods \u2192 handed via intermediary \u2192 council review</div>' +
      '<div class="roora-danger">The mother\u2019s cow or equivalent maternal allocation cannot be reclaimed or used as a simple refund asset.</div>';
    body.appendChild(divorce);

    var custody = document.createElement('div');
    custody.className = 'roora-section';
    custody.innerHTML = '<h4>Child Custody & Allocations</h4>' +
      '<div class="roora-table-wrap"><table class="roora-table">' +
      '<thead><tr><th>Allocation</th><th>Context</th><th>Purpose</th><th>Recipient</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Mombe yeChirera</td><td>Custody & separation</td><td>Maternal support</td><td>Grandparents / mother</td></tr>' +
        '<tr><td>Mombe yeGano</td><td>Out-of-wedlock</td><td>Paternity recognition</td><td>Maternal lineage</td></tr>' +
        '<tr><td>Mombe yeMhere</td><td>Birth</td><td>Birth recognition</td><td>Mother</td></tr>' +
      '</tbody></table></div>' +
      '<p style="margin-top:8px;">In both traditions, customary obligations give the father lineage rights only after proper marriage obligations are met.</p>';
    body.appendChild(custody);

    var masungiro = document.createElement('div');
    masungiro.className = 'roora-section';
    masungiro.innerHTML = '<h4>Masungiro / Pregnancy Protection</h4>' +
      '<div class="roora-code">[Pregnancy Confirmed (7th\u20138th month)]\n  \u2193\nMother returns to maiden home\n  \u2193\nCeremonial handover and rituals\n  \u2193\nBirth and postnatal care\n  \u2193\nReturn to husband\u2019s home with baby</div>' +
      '<ul class="roora-ul">' +
        '<li>Shona protocol: goats (<em>Mbudzi yeMasungiro</em>, <em>Mbudzi yechidandaro</em>).</li>' +
        '<li>Ndebele protocol: gifts, blankets, household items, and maternal family support.</li>' +
      '</ul>';
    body.appendChild(masungiro);

    renderRooraBack(body);
  }

  function renderLibraryGlossary(body){
    body.innerHTML = '<div class="lib-search"><input id="libGlossarySearch" placeholder="Search term, language, or meaning…"></div>' +
      '<div id="glossaryList"></div>';
    var list = $('glossaryList');
    function render(filter){
      list.innerHTML = '';
      var terms = glossaryTerms;
      if (filter) {
        var f = filter.toLowerCase();
        terms = terms.filter(function(t){
          return t.term.toLowerCase().includes(f) ||
            t.lang.toLowerCase().includes(f) ||
            t.lit.toLowerCase().includes(f) ||
            t.meaning.toLowerCase().includes(f) ||
            t.src.toLowerCase().includes(f);
        });
      }
      if (!terms.length) { list.innerHTML = '<div class="lib-empty">No glossary terms match.</div>'; return; }
      terms.forEach(function(t){
        var div = document.createElement('div');
        div.className = 'glossary-term';
        div.innerHTML = '<div class="gt-term">' + t.term + ' <span class="gt-lang">' + t.lang + '</span></div>' +
          '<div class="gt-lit">' + t.lit + '</div>';
        div.addEventListener('click', function(){ openGlossaryDetail(t); });
        list.appendChild(div);
      });
    }
    render('');
    var searchInput = $('libGlossarySearch');
    if (searchInput) {
      searchInput.addEventListener('input', function(){ render(searchInput.value); });
    }
  }

  function openGlossaryDetail(term){
    var existing = $('glossaryDetailOverlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'glossaryDetailOverlay';
    overlay.className = 'panel-overlay show';
    overlay.innerHTML =
      '<div class="glossary-detail-panel show">' +
        '<div class="panel-handle"></div>' +
        '<div class="gd-term">' + term.term + '</div>' +
        '<div class="gd-lang">' + term.lang + '</div>' +
        '<div class="gd-section"><div class="gd-label">Literal Translation</div><div class="gd-value">' + term.lit + '</div></div>' +
        '<div class="gd-section"><div class="gd-label">Functional Meaning</div><div class="gd-value">' + term.meaning + '</div></div>' +
        '<div class="gd-section"><div class="gd-label">Source</div><div class="gd-value gd-src">' + term.src + '</div></div>' +
        '<button class="gd-back">← Back to Glossary</button>' +
      '</div>';
    overlay.addEventListener('click', function(e){
      if (e.target === overlay) overlay.remove();
    });
    var backBtn = overlay.querySelector('.gd-back');
    backBtn.addEventListener('click', function(){ overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function renderLibraryTotems(body){
    body.innerHTML = '<div class="lib-search"><input id="libTotemSearch" placeholder="Search totem…"></div>';
    var list = document.createElement('div');
    list.id = 'libTotemList';
    body.appendChild(list);
    function render(filter){
      list.innerHTML = '';
      var keys = Object.keys(totemRegistry);
      if (filter) {
        var f = filter.toLowerCase();
        keys = keys.filter(function(k){ return k.toLowerCase().includes(f); });
      }
      if (!keys.length) { list.innerHTML = '<div class="lib-empty">No totems match.</div>'; return; }
      keys.forEach(function(key){
        var e = totemRegistry[key];
        var praises = (e.zvidawo||e.izithakazelo||[]).join(', ') || '—';
        var div = document.createElement('div');
        div.className = 'lib-totem-item';
        div.innerHTML =
          '<div class="lib-totem-name">' + key.split('(')[0].trim() + ' <span style="color:var(--accent);font-size:0.7rem;">' + (key.indexOf('(') !== -1 ? key.substring(key.indexOf('(')) : '') + '</span></div>' +
          '<div class="lib-totem-sub">' + praises + ' · ' + e.system + '</div>' +
          '<div class="lib-totem-detail" style="display:none;">' +
            (e.greeting ? '🥂 ' + e.greeting + '<br>' : '') +
            (e.proverb ? '💬 ' + e.proverb + '<br>' : '') +
            (e.taboo ? '🚫 Miko: ' + e.taboo : '') +
            '<button class="btn-sm lib-audio-btn" data-totem="' + key.replace(/"/g,'&quot;') + '" style="margin-top:6px;font-size:0.7rem;background:var(--bg-alt);color:var(--text);width:100%;">🔊 Listen to Praise</button>' +
          '</div>';
        div.addEventListener('click', function(e){
          var detail = div.querySelector('.lib-totem-detail');
          detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        });
        list.appendChild(div);
      });
    }
    render('');
    var searchInput = $('libTotemSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function(){
        render(searchInput.value);
      });
    }
  }

  function renderLibraryProverbs(body){
    var cats = {};
    proverbs.forEach(function(p){
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p);
    });
    var catLabels = { kinship:'👨‍👩‍👧‍👧 Family & Kinship', wisdom:'🧠 Wisdom & Elders', consequence:'⏳ Time & Consequence' };
    Object.keys(cats).forEach(function(cat){
      var sec = document.createElement('div');
      sec.className = 'lib-section';
      sec.innerHTML = '<h4>' + (catLabels[cat] || cat) + '</h4>';
      cats[cat].forEach(function(p){
        var card = document.createElement('div');
        card.className = 'lib-proverb';
        card.innerHTML = '<div class="shona">' + p.shona + '</div>' +
          '<div class="translation">' + p.translation + '</div>' +
          '<div class="meaning">' + p.meaning + '</div>';
        sec.appendChild(card);
      });
      body.appendChild(sec);
    });
  }

  function renderLibraryGreetings(body){
    var times = [
      { key:'morning', shona: timeGreetings.morning.shona, ndebele: timeGreetings.morning.ndebele },
      { key:'afternoon', shona: timeGreetings.afternoon.shona, ndebele: timeGreetings.afternoon.ndebele },
      { key:'evening', shona: timeGreetings.evening.shona, ndebele: timeGreetings.evening.ndebele },
    ];
    times.forEach(function(t){
      var card = document.createElement('div');
      card.className = 'lib-greeting';
      card.innerHTML = '<div class="time">' + t.key + '</div><div class="phrase"><strong>Shona:</strong> ' + t.shona + (t.ndebele ? ' · <strong>Ndebele:</strong> ' + t.ndebele : '') + '</div>';
      body.appendChild(card);
    });
    // Also show totem greetings
    var totemSec = document.createElement('div');
    totemSec.className = 'lib-section';
    totemSec.innerHTML = '<h4>🥂 Totem Greetings</h4>';
    var keys = Object.keys(totemRegistry);
    keys.forEach(function(key){
      var e = totemRegistry[key];
      if (e.greeting) {
        var card = document.createElement('div');
        card.className = 'lib-greeting';
        card.innerHTML = '<div class="time" style="min-width:100px;">' + key.split('(')[0].trim() + '</div><div class="phrase">' + e.greeting + '</div>';
        totemSec.appendChild(card);
      }
    });
    body.appendChild(totemSec);
  }

  function renderLibraryPoems(body){
    body.innerHTML = '<div class="lib-search"><input id="libPoemSearch" placeholder="Search praise poem…"></div>';
    var list = document.createElement('div');
    list.id = 'libPoemList';
    body.appendChild(list);
    function render(filter){
      list.innerHTML = '';
      var keys = Object.keys(totemRegistry);
      if (filter){
        var f = filter.toLowerCase();
        keys = keys.filter(function(k){ return k.toLowerCase().includes(f); });
      }
      if (!keys.length) { list.innerHTML = '<div class="lib-empty">No poems match.</div>'; return; }
      keys.forEach(function(key){
        var e = totemRegistry[key];
        var praises = (e.zvidawo||e.izithakazelo||[]);
        if (!praises.length) return;
        var div = document.createElement('div');
        div.className = 'lib-totem-item';
        div.innerHTML =
          '<div class="lib-totem-name">' + key + '</div>' +
          '<div class="lib-totem-sub">' + praises.join(' · ') + '</div>' +
          (e.greeting ? '<div class="lib-totem-detail" style="display:block;border:none;padding:2px 0 0;">🥂 ' + e.greeting + '</div>' : '');
        list.appendChild(div);
      });
    }
    render('');
    var searchInput = $('libPoemSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function(){ render(searchInput.value); });
    }
  }

  function renderLibraryRegions(body){
    body.innerHTML = '<div class="lib-search"><input id="libRegionSearch" placeholder="Search province…"></div>';
    var list = document.createElement('div');
    list.id = 'libRegionList';
    body.appendChild(list);
    function render(filter){
      list.innerHTML = '';
      var provs = provinces.slice();
      if (filter) {
        var f = filter.toLowerCase();
        provs = provs.filter(function(p){ return p.toLowerCase().includes(f); });
      }
      if (!provs.length) { list.innerHTML = '<div class="lib-empty">No regions match.</div>'; return; }
      provs.forEach(function(prov){
        var div = document.createElement('div');
        div.className = 'lib-totem-item';
        var code = prov.substring(0,2).toUpperCase();
        div.innerHTML =
          '<div class="lib-totem-name">' + prov + ' <span style="color:var(--text-dim);font-size:0.7rem;">ZW-' + code + '</span></div>' +
          '<div class="lib-totem-sub">' + districtSeed.length + ' seeded districts · ' + (prov === 'Harare'||prov==='Bulawayo' ? 'Metropolitan' : 'Rural province') + '</div>' +
          '<div class="lib-totem-detail" style="display:none;">' +
            '🏛️ Districts: ' + districtSeed.join(', ') + '<br>' +
            '📋 Village book format: ZW-' + code + '-[DISTRICT_CODE]<br>' +
            '🆔 National ID mask: 63-XXXXXXX-X-XX' +
          '</div>';
        div.addEventListener('click', function(e){
          if (e.target.classList.contains('lib-audio-btn')) return;
          var detail = div.querySelector('.lib-totem-detail');
          detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        });
        var audioBtn = div.querySelector('.lib-audio-btn');
        if (audioBtn) {
          audioBtn.addEventListener('click', function(e){
            e.stopPropagation();
            playPraiseAudio(audioBtn.dataset.totem);
          });
        }
        list.appendChild(div);
      });
    }
    render('');
    var searchInput = $('libRegionSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function(){ render(searchInput.value); });
    }
  }

  document.querySelectorAll('.lib-tab').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.lib-tab').forEach(function(t){ t.classList.remove('active'); });
      b.classList.add('active');
      renderLibraryTab(b.dataset.libtab);
    });
  });
})();
