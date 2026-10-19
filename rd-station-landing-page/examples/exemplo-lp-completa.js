/* =========================================================
   Exemplo completo (marca fictícia) — monta uma LP de campanha no editor Bricks do RD.

   Uso (na aba /landing-pages/<id>/editar, depois de injetar scripts/bricks-builder.js):
     await RDB.loadTemplates(<id de outra LP da conta com formulário, caixa e botão>)
     RDB.listFormFields()                // confira os campos que existem na conta
     (0,eval)(<este arquivo>)            // define window.EXEMPLO
     const d = EXEMPLO.build()
     await RDB.apply(d); RDB.save(); await RDB.verify(<id>, 'Garanta seu presente')

   Padrões mostrados:
   - fundo da seção como imagem renderizada (gradiente/textura) + textos/botões nativos
   - CTA rolando até a caixa do formulário (href "#<id da caixa>")
   - efeito especial em HTML pequeno e autocontido (quebra-cabeça com peça trocando em loop)
   - cards com a mesma altura (classe aplicada por ID via RDB.baseJS({classes}))
   - cards com painel no hover/toque em HTML (texto nunca cortado)
   - formulário nativo reaproveitando campos da conta
   - pixel da conta de anúncios + evento Lead antes do redirecionamento do RD
   ========================================================= */
(function () {
  const { section, row, column, text, image, button, box, html, form, span: s, para } = window.RDB;
  const RDB = window.RDB;

  // Troque pelas URLs do CDN do RD depois do upload (mantenha um urls.json nome→URL no projeto).
  const IMG = {
    fundoTopo: 'https://SEU-CDN/01-fundo-topo.jpg',
    pecaFixa: 'https://SEU-CDN/02-peca-presente.png',
    pecasLoop: ['https://SEU-CDN/03-peca-produto-a.png', 'https://SEU-CDN/04-peca-produto-b.png', 'https://SEU-CDN/05-peca-produto-c.png'],
    produtoA: 'https://SEU-CDN/06-produto-a.png',
    produtoB: 'https://SEU-CDN/07-produto-b.png',
    produtoC: 'https://SEU-CDN/08-produto-c.png',
    logo: 'https://SEU-CDN/09-logo-branco.png',
  };
  const C = { brand: '#E8606A', ink: '#262625', soft: '#F7F4F3', white: '#FFFFFF' };
  const FORM_BOX_ID = RDB.uid('box'); // âncora dos CTAs

  const h2 = (t, o = {}) => text(para('h2', s(t, { size: 40, color: o.color || C.ink }), o.align || 'left', 1.15), { width: o.width || 520, margin: [6, 10] });
  const body = (t, o = {}) => text(para('p', s(t, { size: o.size || 17, color: o.color || C.ink }), o.align || 'left', 1.5), { width: o.width || 500, margin: [8, 10] });
  const kicker = (t, color = C.brand, align = 'left') => text(para('p', s('— ' + t, { size: 12, color, weight: 700, ls: 2 }), align), { width: 400, margin: [0, 6] });

  /* ---------- efeito do topo: peça fixa + peça da direita trocando em loop ----------
     Todas as peças no MESMO canvas (mesmo recorte), sobrepostas com position:absolute.
     Sem overflow:hidden no contêiner (vira máscara e corta peças/sombras); a contenção
     lateral fica na página (RDB.baseCSS). */
  const puzzleHTML = `<div class="ex-pz" role="img" aria-label="A peça do presente se encaixa com vários produtos">
  <div class="ex-pz-f"><div class="ex-pz-w">
    <img class="ex-pz-a" src="${IMG.pecaFixa}" alt="">
    ${IMG.pecasLoop.map((u) => `<img class="ex-pz-b" src="${u}" alt="">`).join('\n    ')}
  </div></div>
</div>
<style>
.ex-pz{position:relative;width:100%;max-width:560px;margin:0 auto;padding:8% 4%;box-sizing:border-box}
.ex-pz-f{position:relative;z-index:2;animation:exPzFloat 5s 2.2s ease-in-out infinite alternate}
.ex-pz-w{position:relative;width:100%;aspect-ratio:1100/758}
.ex-pz-w img{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 22px 26px rgba(0,0,0,.2))}
.ex-pz-a{z-index:2;animation:exPzA 1.3s .2s cubic-bezier(.16,1,.3,1) both}
.ex-pz-b{z-index:1;opacity:0;transform:translate(34%,-10%) rotate(14deg);transition:transform .95s cubic-bezier(.16,1,.3,1),opacity .55s}
.ex-pz-b.ex-on{opacity:1;transform:none}
.ex-pz-b.ex-out{opacity:0;transform:translate(30%,14%) rotate(-10deg);transition:transform .7s cubic-bezier(.55,0,.75,.2),opacity .5s .1s}
@keyframes exPzA{from{transform:translate(-38%,10%) rotate(-14deg);opacity:0}to{transform:none;opacity:1}}
@keyframes exPzFloat{from{translate:0 0}to{translate:0 -10px}}
@media (prefers-reduced-motion:reduce){.ex-pz-f,.ex-pz-a{animation:none!important}.ex-pz-b{transition:opacity .4s!important;transform:none!important}}
</style>
<script>
(function(){
  var root=document.querySelector('.ex-pz');if(!root)return;
  var pcs=[].slice.call(root.querySelectorAll('.ex-pz-b')),cur=0,timer=null,visible=true;
  var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function show(i){pcs[i].classList.remove('ex-out');pcs[i].classList.add('ex-on')}
  function next(){var p=pcs[cur];p.classList.remove('ex-on');p.classList.add('ex-out');setTimeout(function(){p.classList.remove('ex-out')},800);cur=(cur+1)%pcs.length;setTimeout(function(){show(cur)},rm?0:380)}
  function loop(){clearTimeout(timer);if(!visible||document.hidden)return;timer=setTimeout(function(){next();loop()},2800)}
  setTimeout(function(){show(0);setTimeout(loop,900)},rm?0:700);
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;visible?loop():clearTimeout(timer)}).observe(root);
  document.addEventListener('visibilitychange',function(){document.hidden?clearTimeout(timer):loop()});
})();
</script>`;

  /* ---------- cards de produto com painel no hover (desktop) / toque (mobile) ---------- */
  const produtos = [
    ['Produto A', IMG.produtoA, 'Linha completa', ['Versão 1', 'Versão 2', 'Versão 3']],
    ['Produto B', IMG.produtoB, 'Para uso diário', ['Versão 1', 'Versão 2']],
    ['Produto C', IMG.produtoC, 'Edição especial', ['Versão única']],
  ];
  const cardsHTML = `<ul class="ex-pr">${produtos.map(([nome, img, sub, itens]) => `
  <li tabindex="0"><img src="${img}" alt="${nome}"><strong>${nome}</strong><span>${sub}</span>
    <div class="ex-pr-p"><b>${nome}</b><ul>${itens.map((i) => `<li>${i}</li>`).join('')}</ul></div></li>`).join('')}
</ul>
<style>
.ex-pr{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;font-family:Montserrat,sans-serif}
.ex-pr>li{position:relative;overflow:hidden;min-height:320px;border-radius:24px;background:${C.soft};padding:24px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;cursor:pointer;outline:none}
.ex-pr>li>img{width:70%;max-width:200px;height:auto;margin:auto 0 16px}
/* painel: começa no topo quando o conteúdo não cabe (flex-start + overflow + margin-top:auto no 1º filho) */
.ex-pr-p{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-start;overflow-y:auto;text-align:left;padding:24px;background:${C.brand};color:#fff;clip-path:inset(100% 0 0 0);transition:clip-path .8s cubic-bezier(.32,.72,0,1)}
.ex-pr-p>:first-child{margin-top:auto}
.ex-pr>li:hover .ex-pr-p,.ex-pr>li:focus-within .ex-pr-p,.ex-pr>li.ex-open .ex-pr-p{clip-path:inset(0 0 0 0)}
.ex-pr-p ul{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.ex-pr-p ul li{border:1px solid rgba(255,255,255,.6);border-radius:999px;padding:5px 10px;font-size:13px}
@media (max-width:767px){.ex-pr{grid-template-columns:1fr 1fr;gap:12px}.ex-pr>li{min-height:280px}}
</style>
<script>document.querySelectorAll('.ex-pr>li').forEach(function(li){li.addEventListener('click',function(){li.classList.toggle('ex-open')})});</script>`;

  window.EXEMPLO = {
    build() {
      const classes = {};

      const hero = section([
        row([
          column(6, [
            kicker('CAMPANHA', C.white),
            text(para('h1', s('Seu pedido rende ', { size: 52, color: C.white }) + s('um presente.', { size: 52, color: C.ink, weight: 700 }), 'left', 1.1), { width: 520, margin: [6, 10] }),
            body('Compre produtos participantes e ganhe um presente que cresce com o volume do seu pedido.', { color: C.ink }),
            button('Quero conhecer as condições →', { href: '#' + FORM_BOX_ID, width: 320 }),
          ]),
          column(6, [html(puzzleHTML)]),
        ], { pt: 60, pb: 60 }),
      ], { url: IMG.fundoTopo });

      const step = (n, titulo, desc) => {
        const b = box([
          text(para('p', s(n, { size: 32, color: C.brand, weight: 700 })), { width: 240, margin: [0, 6] }),
          text(para('h3', s(titulo, { size: 18, color: C.ink, weight: 700 }), 'left', 1.5), { width: 240, margin: [4, 4] }),
          body(desc, { size: 14, width: 240 }),
        ], { width: 300, padding: 28, margin: [0, 0] });
        classes[b.properties.id] = 'ex-step';
        return b;
      };
      const comoFunciona = section([
        row([column(12, [kicker('COMO FUNCIONA', C.brand, 'center'), h2('Três passos', { align: 'center', width: 700 })])], { pt: 90, pb: 10 }),
        row([
          column(4, [step('01', 'Fale com seu consultor', 'Conheça as condições da campanha.')], { valign: 'top' }),
          column(4, [step('02', 'Escolha seus produtos', 'Monte o pedido com os produtos participantes.')], { valign: 'top' }),
          column(4, [step('03', 'Ganhe seu presente', 'Quanto maior o volume, maior o presente.')], { valign: 'top' }),
        ], { pt: 10, pb: 90 }),
      ], { color: C.soft });

      const produtosSec = section([
        row([column(12, [kicker('PRODUTOS PARTICIPANTES', C.brand, 'center'), h2('Toda a linha participa', { align: 'center', width: 700 }), html(cardsHTML)])], { pt: 90, pb: 90 }),
      ]);

      const formBox = box([
        kicker('FALE COM A EQUIPE', C.brand, 'center'),
        h2('Garanta seu presente', { align: 'center', width: 460 }),
        form([
          { match: 'name', label: 'Nome completo' },
          { match: 'email', label: 'E-mail' },
          { match: 'PHONE_FIELD', label: 'Celular / WhatsApp' },
          { match: 'uf', label: 'Estado' },
          { match: 'city_id', label: 'Cidade' },
        ], { width: 460, button: { label: 'Quero conhecer as condições →', bg: C.ink } }),
      ], { width: 560, padding: 40, id: FORM_BOX_ID });
      const formSec = section([row([column(12, [formBox])], { pt: 90, pb: 90 })], { color: C.brand });

      const rodape = section([
        row([
          column(6, [image(IMG.logo, { width: 160, align: 'left', alt: 'Marca Exemplo', margin: [0, 0] })]),
          column(6, [text(para('p', s('© Marca Exemplo', { size: 13, color: 'rgba(255,255,255,.7)' }), 'right'), { width: 300, align: 'right', margin: [0, 0] })]),
        ], { pt: 40, pb: 40 }),
      ], { color: C.ink });

      const css = RDB.baseCSS() + `
.ex-step{box-shadow:0 24px 48px -32px rgba(38,38,37,.25)}
@media (min-width:768px){.ex-step{flex-grow:1}}`;

      return RDB.page({
        title: 'Campanha | Marca Exemplo',
        description: 'Compre produtos participantes e ganhe um presente que cresce com o volume do pedido.',
        width: 1140,
        css,
        jsBody: RDB.baseJS({ classes }) + RDB.metaPixelJS('<ID_DO_PIXEL>', { event: 'Lead', params: { content_name: 'campanha-lp-rd' } }),
      }, [hero, comoFunciona, produtosSec, formSec, rodape]);
    },
  };
})();
