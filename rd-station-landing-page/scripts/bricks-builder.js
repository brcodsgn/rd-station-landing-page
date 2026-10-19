/* =========================================================
   bricks-builder.js — monta Landing Pages NATIVAS no editor Bricks do RD Station.

   Roda DENTRO da aba do editor (app.rdstation.com.br/landing-pages/<id>/editar),
   injetado via "loader" de arquivo (ver SKILL.md). Expõe window.RDB.

   Fluxo típico no console da aba (via javascript_tool):
     await RDB.loadTemplates(<idDeUmaLPExistenteComFormulario>)
     // ...montar seções com RDB.section/row/column/text/image/button/box/html/form...
     const d = RDB.page({ title, description, width: 1140, css, jsBody, jsHead }, [secoes])
     await RDB.apply(d)          // setDesign (2x, com pausa)
     RDB.save()                  // clica no #save-btn real
     await RDB.verify(<idDaLP>, 'um-trecho-unico')  // confirma no servidor
   ========================================================= */
(function () {
  const RDB = (window.RDB = window.RDB || {});

  RDB.config = Object.assign({
    font: 'Montserrat, sans-serif', // fonte nativa do RD (editável pela equipe)
    mobileWidth: 340,               // largura útil dos componentes no mobile
    mobilePaddingScale: 0.55,       // respiro vertical no mobile = desktop * fator
  }, RDB.config || {});

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (type) => `rd-${type}-${Math.random().toString(36).slice(2, 10)}`;
  const NOBORDER = { top: true, left: true, color: '#000000', right: true, style: 'none', width: 0, bottom: true, radius: 0 };
  RDB.clone = clone;
  RDB.uid = uid;

  RDB.bg = (color, url) => ({
    url: url || '', type: url ? 'image' : (!color || color === 'transparent' ? 'transparent' : 'color'),
    color: color || 'transparent', cover: !!url, parallax: null, position: { x: 50, y: 50 },
    imageColor: 'rgba(74,144,226,0)', imageOrder: 'below',
  });

  /* ---------- modelos de componentes ----------
     O schema do Bricks não é documentado: clonamos componentes reais de uma LP
     existente da conta (de preferência uma que tenha formulário, caixa e botão). */
  function parseDesign(html) {
    const m = html.match(/window\.landingPageDesign = (\{.*?\});\s*\n/s);
    return m ? JSON.parse(m[1]) : null;
  }
  RDB.fetchDesign = async (lpId) => {
    const r = await fetch(`/landing-pages/${lpId}/editar`, { credentials: 'include', cache: 'no-store' });
    if (!r.ok) throw new Error(`LP ${lpId}: HTTP ${r.status}`);
    return parseDesign(await r.text());
  };
  RDB.loadTemplates = async (...refLpIds) => {
    const T = {};
    const walk = (n) => {
      if (!n) return;
      const t = n.type;
      if (t === 'button') {
        const kind = n.properties && n.properties.type === 'submit' ? 'submitButton' : 'button';
        T[kind] = T[kind] || n;
      } else if (!T[t]) T[t] = n;
      (n.children || []).forEach(walk);
    };
    for (const id of refLpIds) walk(await RDB.fetchDesign(id));
    walk(window.landingPageDesign); // a própria LP também serve de fonte
    RDB.T = T;
    const need = ['section', 'row', 'column', 'text', 'image', 'button', 'box', 'form'];
    return { found: Object.keys(T), missing: need.filter((k) => !T[k]) };
  };
  const tpl = (k) => {
    if (!RDB.T || !RDB.T[k]) throw new Error(`Modelo "${k}" não carregado. Rode RDB.loadTemplates(idDeOutraLP) com uma LP que tenha esse componente.`);
    return clone(RDB.T[k]);
  };

  /* ---------- texto (HTML com estilos inline, como o TinyMCE do RD gera) ---------- */
  RDB.span = (txt, o = {}) => {
    const st = [`font-family: ${o.family || RDB.config.font}`];
    if (o.size) st.push(`font-size: ${o.size}px`);
    if (o.color) st.push(`color: ${o.color}`);
    if (o.weight) st.push(`font-weight: ${o.weight}`);
    if (o.ls) st.push(`letter-spacing: ${o.ls}px`);
    return `<span style="${st.join('; ')};">${txt}</span>`;
  };
  RDB.para = (tag, inner, align = 'left', lh = 1.4) => `<${tag} style="text-align: ${align}; line-height: ${lh}; margin: 0;">${inner}</${tag}>`;
  const scaleSizes = (html, f) => html.replace(/font-size: (\d+)px/g, (m, n) => `font-size: ${Math.max(12, Math.round(n * f))}px`);

  RDB.text = (content, { width, align = 'left', mAlign = 'center', mScale = 0.75, margin = [10, 10], mContent } = {}) => {
    const n = tpl('text'); const p = n.properties;
    Object.assign(p, {
      id: uid('text'), align, width, height: 'auto', margin: { top: margin[0], bottom: margin[1] },
      border: clone(NOBORDER), content, className: 'rd-text',
    });
    p.mobileProperties = {
      align: mAlign, width: Math.min(width, RDB.config.mobileWidth), height: 'auto', margin: { top: margin[0], bottom: margin[1] },
      content: mContent || scaleSizes(content, mScale).replace(/text-align: (left|right)/g, `text-align: ${mAlign}`), isActive: true,
    };
    n.children = [];
    return n;
  };

  RDB.image = (url, { width, align = 'center', alt = '', radius = 0, margin = [10, 10], mWidth } = {}) => {
    const n = tpl('image'); const p = n.properties;
    Object.assign(p, {
      id: uid('image'), url, align, width, height: 'auto', description: alt, margin: { top: margin[0], bottom: margin[1] },
      border: Object.assign(clone(NOBORDER), { radius }), link: { href: '', title: '', target: '', enabled: false }, className: 'rd-image',
    });
    p.mobileProperties = {
      align: 'center', width: mWidth || Math.min(width, RDB.config.mobileWidth), height: 'auto', margin: { top: margin[0], bottom: margin[1] },
      border: Object.assign(clone(NOBORDER), { radius }), isActive: true, aspectRatioLocked: true,
    };
    n.children = [];
    return n;
  };

  // Botão de link. Para rolar até uma seção/caixa use href "#<id-do-componente>".
  RDB.button = (label, { href = '#', target = '_self', width = 300, height = 56, align = 'left', bg = '#262625', color = '#FFFFFF', size = 16, radius = 999, margin = [24, 10], mWidth, shadow = true } = {}) => {
    const n = tpl('button'); const p = n.properties;
    const border = { top: false, left: false, color: bg, right: false, style: 'solid', width: 0, bottom: false, radius };
    const boxShadow = shadow ? { blur: 24, size: 0, color: 'rgba(38,38,37,0.25)', positionX: 0, positionY: 10 } : { blur: 0, size: 0, color: '#000000', positionX: 0, positionY: 0 };
    Object.assign(p, {
      id: uid('button'), type: 'button', label, link: { href, type: 'web', title: label, target },
      font: { bold: true, size, color, family: RDB.config.font, italic: false, underline: false },
      align, width, height, margin: { top: margin[0], bottom: margin[1] }, border, boxShadow,
      background: { type: 'color', color: bg }, textAlign: 'center', className: 'rd-button',
    });
    p.mobileProperties = {
      font: { bold: true, size: Math.min(size, 16), color, family: RDB.config.font, italic: false, underline: false },
      align: 'center', width: mWidth || Math.min(width, RDB.config.mobileWidth), height: Math.min(height, 52),
      margin: { top: margin[0], bottom: margin[1] }, border: clone(border), isActive: true, boxShadow: clone(boxShadow), background: { type: 'color', color: bg },
    };
    n.children = [];
    return n;
  };

  // HTML pontual (efeitos que o editor não faz). Todo o CSS/JS do efeito vai junto, com classes prefixadas.
  RDB.html = (content) => ({ type: 'html', properties: { id: uid('html'), content, className: 'rd-html' }, children: [] });

  RDB.box = (children, { width, bg = '#FFFFFF', radius = 24, padding = 32, align = 'center', margin = [10, 10], id, mWidth, height = 'auto' } = {}) => {
    const n = tpl('box'); const p = n.properties;
    const border = { top: true, left: true, color: 'transparent', right: true, style: 'solid', width: 0, bottom: true, radius };
    Object.assign(p, {
      id: id || uid('box'), align, width, height, margin: { top: margin[0], bottom: margin[1] },
      padding: { top: padding, left: padding, right: padding, bottom: padding }, border, background: RDB.bg(bg), className: 'rd-box',
    });
    const mp = Math.min(padding, 24);
    p.mobileProperties = {
      align: 'center', width: mWidth || Math.min(width, RDB.config.mobileWidth), height: 'auto', margin: { top: margin[0], bottom: margin[1] },
      padding: { top: mp, left: mp, right: mp, bottom: mp }, border: clone(border), background: RDB.bg(bg), isActive: true,
    };
    n.children = children;
    return n;
  };

  RDB.column = (size, children, { valign = 'middle', padding = [0, 10, 0, 10] } = {}) => {
    const n = tpl('column'); const p = n.properties;
    Object.assign(p, {
      id: uid('column'), size, padding: { top: padding[0], right: padding[1], bottom: padding[2], left: padding[3] },
      background: RDB.bg('transparent'), alignInside: { vertical: valign }, className: 'rd-column',
    });
    p.mobileProperties = { padding: { top: 0, left: 10, right: 10, bottom: 0 }, isActive: true };
    n.children = children;
    return n;
  };

  // O renderizador do RD IGNORA o padding da linha: o respiro vertical (pt/pb) é aplicado nas colunas.
  // No mobile as colunas empilham, então só a primeira recebe o topo e só a última recebe a base.
  RDB.row = (columns, { pt = 10, pb = 10, minHeight = 50 } = {}) => {
    const n = tpl('row'); const p = n.properties;
    Object.assign(p, { id: uid('row'), padding: { top: 0, left: 10, right: 10, bottom: 0 }, minHeight, className: 'rd-row' });
    const k = RDB.config.mobilePaddingScale;
    columns.forEach((c, i) => {
      const cp = c.properties;
      cp.padding.top = pt;
      cp.padding.bottom = pb;
      const first = i === 0, last = i === columns.length - 1;
      cp.mobileProperties.padding = { top: first ? Math.round(pt * k) : 16, left: 10, right: 10, bottom: last ? Math.round(pb * k) : 16 };
    });
    n.children = columns;
    return n;
  };

  RDB.section = (rows, { color = '#FFFFFF', url, id } = {}) => {
    const n = tpl('section'); const p = n.properties;
    const border = { top: false, left: false, color: '#000000', right: false, style: 'none', width: 0, bottom: false, radius: 0 };
    Object.assign(p, { id: id || uid('section'), border, background: RDB.bg(color, url), className: 'rd-section' });
    p.mobileProperties = { border: clone(border), isActive: true };
    n.children = rows;
    return n;
  };

  /* ---------- formulário nativo ----------
     Reaproveita campos que JÁ EXISTEM na conta (clonados do formulário modelo).
     fields: [{ match: 'name' | 'email' | 'cf_xxx' | 'uf' | 'city_id' | tipo ('PHONE_FIELD'...), label, required }]
     Campos personalizados só funcionam se existirem na conta; liste os disponíveis com RDB.listFormFields(). */
  RDB.listFormFields = () => {
    const fs = tpl('form').children.find((c) => c.type === 'fieldset');
    return fs.children.map((c) => ({ type: c.type, name: c.properties.name, api: c.properties.api_identifier, label: c.properties.label, options: (c.properties.options || []).length }));
  };
  RDB.form = (fields, { width = 540, button = {}, fieldStyle = {}, labelColor = '#262625', captcha = true, mWidth = 300 } = {}) => {
    const ref = tpl('form');
    const fs = ref.children.find((c) => c.type === 'fieldset');
    const pool = fs.children.slice();
    const pick = (m) => pool.find((c) => c.type === m || (c.properties && (c.properties.name === m || c.properties.api_identifier === m)));
    const out = [];
    fields.forEach((f) => {
      const src = pick(f.match);
      if (!src) throw new Error(`Campo "${f.match}" não existe no formulário modelo. Veja RDB.listFormFields().`);
      const n = clone(src);
      Object.assign(n.properties, { label: f.label || n.properties.label, required: f.required !== false, id: uid(n.type.toLowerCase()) });
      out.push(n);
    });
    const cap = pool.find((c) => c.type === 'CAPTCHA_FIELD');
    if (captcha && cap) out.push(clone(cap));
    fs.children = out;

    const font = RDB.config.font;
    const p = ref.properties;
    p.id = uid('form'); p.align = 'center'; p.width = width; p.height = 'auto'; p.margin = { top: 0, bottom: 0 };
    p.fields = Object.assign({
      font: { bold: false, size: 15, color: '#262625', family: font, italic: false },
      border: { top: true, left: true, color: '#E7E1DF', right: true, style: 'solid', width: 1, bottom: true, radius: 14 },
      height: 48, shadow: { inner: false }, columns: 1, section: 'fields', spacing: 14, textAlign: 'left', background: RDB.bg('#F7F4F3'),
    }, fieldStyle);
    p.labels = { font: { bold: true, size: 14, color: labelColor, family: font, italic: false }, section: 'labels', disabled: false, textAlign: 'left' };
    p.mobileProperties = {
      align: 'center', width: mWidth, height: 'auto', margin: { top: 0, bottom: 0 },
      fields: Object.assign(clone(p.fields), { font: Object.assign(clone(p.fields.font), { size: 16 }) }), labels: clone(p.labels), isActive: true,
    };

    const btn = ref.children.find((c) => c.type === 'button');
    const b = Object.assign({ label: 'Enviar', bg: '#262625', color: '#FFFFFF', height: 56, radius: 999 }, button);
    const bp = btn.properties;
    bp.id = uid('button'); bp.label = b.label;
    bp.font = { bold: true, size: 16, color: b.color, family: font, italic: false, underline: false };
    bp.width = width; bp.height = b.height; bp.margin = { top: 16, bottom: 0 };
    bp.border = { top: false, left: false, color: b.bg, right: false, style: 'solid', width: 0, bottom: false, radius: b.radius };
    bp.boxShadow = { blur: 0, size: 0, color: '#000000', positionX: 0, positionY: 0 };
    bp.background = { type: 'color', color: b.bg };
    bp.mobileProperties = Object.assign(clone(bp.mobileProperties || {}), {
      font: clone(bp.font), align: 'center', width: mWidth, height: 52, margin: { top: 16, bottom: 0 },
      border: clone(bp.border), boxShadow: clone(bp.boxShadow), background: clone(bp.background), isActive: true,
    });
    return ref;
  };

  /* ---------- CSS e JS de página (correções que o RD precisa) ---------- */
  RDB.baseCSS = () => `/* gerado por bricks-builder */
html{scroll-behavior:smooth}
/* contenção lateral: corta só o que sai da tela (peças animadas) */
html{overflow-x:hidden}
@supports (overflow:clip){html,body{overflow-x:clip}}
.rd-text{font-family:${RDB.config.font}}
.rd-button,.bricks-form__submit .rd-button{display:flex;align-items:center;justify-content:center}
.rd-button{transition:transform .5s cubic-bezier(.32,.72,0,1),filter .5s}
.rd-button:hover{transform:translateY(-2px);filter:brightness(1.08)}
.rdb-rv{opacity:0;transform:translateY(40px);transition:opacity .9s cubic-bezier(.32,.72,0,1),transform 1.1s cubic-bezier(.32,.72,0,1)}
.rdb-rv.rdb-in{opacity:1;transform:none}
/* mobile: o RD não aplica o alinhamento mobile dos textos */
@media (max-width:767px){.rd-text{align-self:center!important;width:100%!important;max-width:100%!important}}
@media (prefers-reduced-motion:reduce){.rdb-rv{opacity:1;transform:none}}`;

  // classes: { 'rd-box-xxx': 'minha-classe' } → adicionadas no load (o editor não expõe className de forma confiável)
  RDB.baseJS = ({ classes = {}, reveal = true, smoothScroll = true } = {}) => `<script>
(function(){
  var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var map=${JSON.stringify(classes)};
  Object.keys(map).forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add(map[id])});
  ${reveal ? `/* revelação ao rolar: rodapé fora; nada fica oculto se o observador falhar */
  if(!rm&&'IntersectionObserver' in window){
    var secs=[].slice.call(document.querySelectorAll('.rd-section'));var first=secs[0],foot=secs[secs.length-1];
    var els=[].slice.call(document.querySelectorAll('.rd-section .rd-text,.rd-section .rd-image,.rd-section .rd-button,.rd-section .rd-box,.rd-section .rd-html')).filter(function(el){return !(first&&first.contains(el))&&!(foot&&foot.contains(el))&&!(el.closest('.rd-box')&&!el.classList.contains('rd-box'))});
    var show=function(el){el.classList.add('rdb-in')};
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){show(e.target);io.unobserve(e.target)}})},{rootMargin:'0px',threshold:0});
    els.forEach(function(el){el.classList.add('rdb-rv');io.observe(el)});
    var check=function(){var h=window.innerHeight,end=(window.innerHeight+window.pageYOffset)>=(document.documentElement.scrollHeight-4);els.forEach(function(el){if(el.classList.contains('rdb-in'))return;var r=el.getBoundingClientRect();if(end||(r.top<h&&r.bottom>0))show(el)})};
    window.addEventListener('scroll',function(){window.requestAnimationFrame(check)},{passive:true});
    window.addEventListener('load',check);
  }` : ''}
  ${smoothScroll ? `/* rolagem suave para âncoras (#id) + foco no 1º campo do formulário */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;
    var id=a.getAttribute('href').slice(1);if(!id)return;var el=document.getElementById(id);if(!el)return;
    e.preventDefault();el.style.scrollMarginTop='24px';el.scrollIntoView({behavior:rm?'auto':'smooth',block:'start'});
    var f=el.querySelector('input:not([type=hidden]),select,textarea');if(f)setTimeout(function(){try{f.focus({preventScroll:true})}catch(x){}},rm?0:900);
  },true);` : ''}
})();
</script>`;

  /* ---------- rastreamento (Meta Pixel) ----------
     O RD injeta no fim do <body> o pixel configurado na CONTA (vale para todas as LPs).
     Para usar outro pixel só nesta LP, inclua este trecho no jsBody: ele roda DEPOIS do
     handler do RD (window.conversionSuccess, que mostra o agradecimento e redireciona)
     e ANTES do pixel da conta. Envolvemos conversionSuccess para disparar o evento antes
     do redirecionamento. trackSingle manda o evento só para este pixel. */
  RDB.metaPixelJS = (pixelId, { event = 'Lead', params = {} } = {}) => `
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');
(function(){
  var rdSuccess=window.conversionSuccess;
  if(typeof rdSuccess!=='function')return;
  window.conversionSuccess=function(){
    try{fbq('trackSingle','${pixelId}','${event}',${JSON.stringify(params)})}catch(e){}
    return rdSuccess.apply(this,arguments);
  };
})();
</script>`;

  /* ---------- reordenar cards/colunas de uma linha ----------
     Troca o CONTEÚDO das colunas (mantém padding/tamanho de cada posição).
     order: nova ordem pelos índices antigos, ex. [2,0,1] = a 3ª vira 1ª. */
  RDB.findRow = (design, ...texts) => RDB.find(design, (n) => n.type === 'row' && texts.every((t) => JSON.stringify(n).includes(t)));
  RDB.reorderColumns = (row, order) => {
    const kids = row.children.map((c) => c.children);
    row.children.forEach((c, i) => { c.children = kids[order[i]]; });
    return row;
  };

  /* ---------- desempenho ---------- */
  // Lista as URLs de imagem do CDN do RD usadas no design (componentes, blocos HTML e fundos).
  RDB.listImageUrls = (design) => [...new Set(JSON.stringify(design).match(/https:\/\/[a-z0-9.-]*cloudfront\.net\/cms\/files\/\d+\/\d+\/\$[a-z0-9]+/g) || [])];
  // Troca URLs em TODO o design (map: { urlAntiga: urlNova }). Devolve { design, trocadas }.
  RDB.swapUrls = (design, map) => {
    let s = JSON.stringify(design), n = 0;
    Object.keys(map).forEach((u) => { if (s.includes(u)) { s = s.split(u).join(map[u]); n++; } });
    return { design: JSON.parse(s), trocadas: n };
  };
  // <link rel=preload> para imagens da primeira dobra (vai no javascriptHead).
  RDB.preloadHead = (urls) => '\n<!-- imagens da primeira dobra -->\n' + urls.map((u) => `<link rel="preload" href="${u}" as="image" fetchpriority="high">`).join('\n');
  // Correções de acessibilidade do formulário nativo do RD (vai no jsBody):
  // labels nos campos anti-spam ocultos e links/roles inválidos do select2 (campo Cidade).
  RDB.formA11yJS = () => `
<style>.rdb-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}</style>
<script>
(function(){
  function fix(){
    ['emP7yF13ld','sh0uldN07ch4ng3'].forEach(function(n){
      var el=document.querySelector('input[name="'+n+'"]');if(!el)return;
      if(!el.id)el.id='hp-'+n;
      if(document.querySelector('label[for="'+el.id+'"]'))return;
      var l=document.createElement('label');l.className='rdb-sr';l.htmlFor=el.id;l.textContent='Campo oculto anti-spam';
      el.parentNode.insertBefore(l,el);
    });
    document.querySelectorAll('a.select2-choice[href^="javascript:"]').forEach(function(a){a.removeAttribute('href');a.setAttribute('role','button')});
    document.querySelectorAll('input.select2-focusser[role="button"]').forEach(function(i){i.removeAttribute('role')});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix);else fix();
  window.addEventListener('load',function(){fix();setTimeout(fix,1500)});
})();
</script>`;
  // Em blocos HTML: imagens que só aparecem depois (ex.: peças de um loop) usam data-src e
  // este script põe o src depois do load — saem da disputa com o conteúdo da primeira dobra.
  RDB.deferImagesJS = (selector = 'img[data-src]') => `<script>(function(){function go(){document.querySelectorAll('${selector}').forEach(function(im){im.src=im.getAttribute('data-src');im.removeAttribute('data-src')})}if(document.readyState==='complete')go();else window.addEventListener('load',go)})();</script>`;

  /* ---------- prévia: congelar animações no estado final (para capturas/medições) ---------- */
  RDB.previewDoc = () => { const f = [...document.querySelectorAll('iframe')].find((x) => x.offsetWidth > 0); return f && f.contentDocument; };
  RDB.freezeAnimations = (doc, scope = '*') => {
    const st = doc.createElement('style');
    st.textContent = `${scope}{animation-delay:-10s!important;animation-play-state:paused!important}`;
    doc.head.appendChild(st); return st;
  };

  /* ---------- página, aplicar, salvar, verificar ---------- */
  RDB.page = ({ title, description = '', keywords = '', width = 1140, css = '', jsHead = '', jsBody = '' } = {}, sections) => {
    const base = clone(window.landingPageDesign);
    Object.assign(base.properties, { width, css, javascriptHead: jsHead, javascriptBody: jsBody });
    if (title) base.properties.title = title;
    if (description) base.properties.description = description;
    if (keywords) base.properties.keywords = keywords;
    base.children = sections;
    return base;
  };

  RDB.current = async () => { let r = bricksEditor.exportDesign(); if (r && r.then) r = await r; return typeof r === 'string' ? JSON.parse(r) : r; };
  RDB.backup = async () => { window.__rdbBackup = JSON.stringify(await RDB.current()); return window.__rdbBackup.length; };
  RDB.apply = async (design) => {
    await bricksEditor.setDesign(design);
    await new Promise((r) => setTimeout(r, 800));
    await bricksEditor.setDesign(design);
    return { sections: design.children.length, size: JSON.stringify(design).length };
  };
  // Há DOIS botões "Salvar": o React costuma ficar disabled. O que salva de verdade é #save-btn.
  RDB.save = () => { const b = document.getElementById('save-btn'); if (!b) throw new Error('#save-btn não encontrado'); b.click(); return 'salvando'; };
  RDB.verify = async (lpId, ...needles) => {
    const h = await fetch(`/landing-pages/${lpId}/editar`, { credentials: 'include', cache: 'no-store' }).then((r) => r.text());
    return Object.fromEntries(needles.map((n) => [n, h.includes(n)]));
  };

  /* ---------- edição pontual (preserva ajustes feitos pela equipe) ---------- */
  RDB.find = (design, pred) => { let hit = null; const w = (n) => { if (!hit && pred(n)) hit = n; (n.children || []).forEach(w); }; w(design); return hit; };
  RDB.findHtml = (design, marker) => RDB.find(design, (n) => n.type === 'html' && n.properties.content.includes(marker));
  RDB.stripStyle = (s) => s.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/\s+/g, ' ').trim();
})();
