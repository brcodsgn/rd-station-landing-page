---
name: rd-station-landing-page
description: Replica uma landing page (HTML pronto, protótipo, KV ou referência visual) como página NATIVA no editor de Landing Pages do RD Station Marketing (editor Bricks), operando o Chrome do usuário já logado no RD. Monta seções, textos, imagens, botões, caixas e o Formulário nativo do RD por JSON (bricksEditor.setDesign), sobe imagens pelo uploader do RD, usa HTML só para efeitos especiais, salva e verifica no servidor. Use sempre que o usuário quiser "subir/passar/levar/replicar/construir" uma LP ou página de captura no RD Station, montar LP no RD com formulário do RD, converter um HTML em LP editável do RD, ou corrigir/ajustar uma LP que já está no editor do RD (alinhamento mobile, espaçamento, animações, formulário, imagens), mesmo que ele não fale em "Bricks" ou "nativo".
---

# LP nativa no RD Station (editor Bricks)

Objetivo: a LP final deve ser **editável pela equipe no editor do RD** (componentes nativos), **leve** e **fiel ao design**. Blocos HTML gigantes colados em módulos HTML ficam quebrados, pesados e ninguém consegue editar — evite essa abordagem. HTML só entra em efeitos que o editor não faz (animações especiais, cards com hover, barra digitando).

Leia `references/armadilhas.md` antes de começar (tudo ali já deu problema real) e `references/formato-bricks.md` quando precisar do formato dos componentes. `examples/exemplo-lp-completa.js` é uma página completa (marca fictícia) feita com este processo: topo com quebra-cabeça animado em loop, passos com a mesma altura, cards de produto com painel no hover, formulário nativo, rodapé e pixel — bom para copiar padrões.

## 0. Pré-requisitos e limites
- Ferramentas do **Claude in Chrome** (carregue `tabs_context_mcp, navigate, computer, find, javascript_tool, file_upload, read_network_requests, get_page_text, browser_batch, tabs_close_mcp` numa única ToolSearch).
- O usuário precisa estar **logado no RD no Chrome**. Nunca digite senha nem faça login por ele.
- **Publicar/Atualizar** uma LP é ação externa: só com "pode publicar" explícito. Configurações (redirecionamento pós-envio, agradecimento, reCAPTCHA, LGPD, e-mail automático, redes sociais, URL) são decisões da equipe — pergunte.
- A LP de destino normalmente já existe (a equipe cria em branco a partir de um modelo). Descubra o ID: `/landing-pages` → link `/landing-pages/<id>`. Editor: `/landing-pages/<id>/editar`. **Confira o ID a cada sessão** — a equipe pode duplicar/renomear (a antiga passa a dar 500).

## 1. Planejar a página
Mapeie cada seção da referência para componentes nativos:
- Fundo com gradiente/textura/composição de produtos → **renderize uma imagem** (HTML local + Chrome headless) e use como fundo da seção (`section({url})`). Mantém visual rico e editável.
- Títulos/parágrafos → `text` (HTML com spans inline). Fonte: prefira as nativas do RD (Montserrat etc.); fontes próprias pesam e o editor não as oferece.
- Imagens de produto → `image` (PNG recortado). Composições fixas (ex.: leque de embalagens) → uma imagem só.
- CTAs → `button` com `href:"#<id-do-alvo>"` (ex.: a caixa/seção do formulário) — o script de rolagem suave cuida do resto.
- Formulário → `form` nativo reaproveitando campos existentes da conta (passo 4).
- Efeitos (encaixe animado, texto digitando, hover com painel) → `html` pequeno e autocontido (CSS/JS próprios, classes prefixadas, `prefers-reduced-motion`).
Mostre ao usuário o mapa das seções antes de construir se houver dúvida de escopo.

## 2. Imagens
1. Prepare arquivos numerados por ordem de aparição (`01-hero-...png`, `02-...`) numa pasta do projeto e mantenha um `urls.json` nome→URL. PNG com transparência para recortes; JPG para fotos/fundos. Reduza para ~2× o tamanho exibido.
2. Suba pelo uploader do RD (só funciona com o modal aberto): no editor, clique num componente **Imagem** → `find` "Carregar imagem" → clique → `find` o input de arquivo do modal → `file_upload`. A URL fica no componente selecionado: leia via `exportDesign()`. Repita `find` a cada arquivo (refs mudam).
3. Verifique cada URL baixando (curl/Python) e comparando bytes com o arquivo local. Não aceita SVG/WOFF.
4. Prefira **WebP** (~2× a largura exibida, ≤ 100 KB). Converta com `scripts/webp/` (`servidor.py <pasta>` + `converter.html` no Chrome; detalhes no cabeçalho do servidor) e compare original × WebP antes de subir.
Se o usuário preferir subir sozinho, peça a lista de URLs **na ordem da pasta** e confira os bytes — é comum faltar um arquivo e deslocar a lista.

## 3. Injetar a biblioteca no editor
`scripts/bricks-builder.js` expõe `window.RDB`. Scripts de `localhost` são bloqueados na página HTTPS, então use o loader de arquivo:

```js
// javascript_tool (uma vez por carregamento da aba)
let i=document.getElementById('rdb-loader'); if(!i){i=document.createElement('input');i.type='file';i.id='rdb-loader';
i.setAttribute('aria-label','rdb loader');i.style.cssText='position:fixed;left:0;top:0;width:10px;height:10px;opacity:.01;z-index:99999';
document.body.appendChild(i);i.addEventListener('change',async()=>{window.__code=await i.files[0].text()})} 'ok'
```
Depois: `find` "rdb loader" → `file_upload` com o `.js` (builder e/ou seu arquivo de montagem) → `javascript_tool`: `(0,eval)(window.__code)`.
Para vários arquivos, concatene-os num só antes de enviar.

## 4. Carregar modelos e campos
```js
await RDB.backup()                          // cópia do design atual em window.__rdbBackup
await RDB.loadTemplates(<id de LP existente com formulário, caixa e botão>)  // → {found, missing}
RDB.listFormFields()                        // campos que existem na conta (name, api cf_*, opções)
```
O schema do Bricks não é documentado: os componentes são clonados de LPs reais da conta. Use os campos personalizados que já existem (mantém a base de leads padronizada); se faltar algum, peça para a equipe criar.

## 5. Montar e aplicar
Escreva a montagem num arquivo `.js` do projeto (fonte da verdade — reaplicável e versionável), usando `RDB.section/row/column/text/image/button/box/html/form` e `RDB.page({title, description, width:1140, css: RDB.baseCSS()+cssExtra, jsBody: RDB.baseJS({classes})+jsExtra}, secoes)`.
- `RDB.row(cols,{pt,pb})`: respiro vertical vai para as colunas (o RD ignora padding de linha).
- `RDB.baseCSS()` já inclui: centralização de textos no mobile, botões centralizados, rolagem suave, estilos da revelação.
- `RDB.baseJS()` já inclui: revelação ao rolar à prova de falha (primeira e última seção fora), rolagem suave com foco no 1º campo, e aplica classes extras por ID (`classes:{'rd-box-x':'minha-classe'}`).
- `RDB.baseCSS()` também contém a contenção lateral da página: efeitos que entram pela lateral **não** precisam (nem devem) ter `overflow:hidden`.
- Pixel de anúncios só nesta LP + evento no envio do formulário: some `RDB.metaPixelJS('<id>', {event:'Lead', params:{content_name:'...'}})` ao `jsBody` (ver armadilhas → Rastreamento).
Aplique: `await RDB.apply(d)`.

## 6. Salvar e verificar (não pule)
`RDB.save()` (clica o `#save-btn` real) → aguarde ~6 s → `read_network_requests` com `/content/` deve mostrar **PUT 200** → `await RDB.verify(<id>, '<trecho único da mudança>')` deve dar `true`. Se não salvar, aguarde ~30 s, `RDB.apply` de novo e salve. Só diga "salvo" depois do `verify`.

## 7. Conferir na pré-visualização
Botão "Pré-visualizar" → a prévia é um `iframe` (mesma origem): inspecione com `javascript_tool` (`contentDocument`). Alterne **Desktop/Mobile**. Cheque por DOM, não só por screenshot:
- textos centralizados no mobile (offset do centro = 0), sem rolagem horizontal;
- imagens carregadas (`naturalWidth>0`), botões com largura normal;
- painéis/overlays: `scrollHeight <= clientHeight` e topo não cortado.
Para componentes HTML, teste também localmente em 320/375/414/768/1024/1280px (painel do navegador com `resize_window`) antes de aplicar.
Para medir/fotografar efeitos animados: `RDB.freezeAnimations(RDB.previewDoc(), '.minha-classe *')` mostra o estado final. Teste ajustes de posição injetando `<style>` na prévia antes de gravar.
Limitação: com a aba do Chrome em segundo plano, animações e timers ficam lentos; não conclua que "a animação quebrou" por um screenshot parado — valide lógica de animação por simulação/DOM e peça ao usuário para conferir o movimento.

## 7b. Desempenho (antes de publicar ou quando pedirem "deixar verde")
1. Lighthouse local (comando em armadilhas → Desempenho), celular e desktop. Compare LCP **observado** × simulado para achar a causa real.
2. Imagens: liste com `RDB.listImageUrls(d)`, converta para WebP, suba (uma por vez), confira bytes e troque tudo com `RDB.swapUrls(d, mapa)`.
3. Blocos HTML: `data-src` + `RDB.deferImagesJS()` para imagens tardias; `loading="lazy"` + `width/height` abaixo da dobra.
4. `javascriptHead`: `RDB.preloadHead([...])` com as imagens da primeira dobra. `jsBody`: `RDB.formA11yJS()`.
5. Título e descrição em Configurações (com autorização). Publique (com autorização) e rode o Lighthouse de novo; relate antes × depois e o que é limite do RD.

## 8. Ajustes depois (a equipe também edita)
- Busque a LP atual pelo nome na lista (ID pode ter mudado).
- Para mexer num componente: `const d=await RDB.current()`, localize (`RDB.findHtml(d,'marcador')` / `RDB.find`), **compare com a sua versão** (`RDB.stripStyle`) e preserve o que a equipe mudou (ex.: imagem trocada). Altere só o necessário, `RDB.apply(d)`, salve e verifique.
- Mantenha o arquivo de montagem do projeto sincronizado com cada patch ao vivo.
- Reordenar cards: `RDB.reorderColumns(RDB.findRow(d, 'texto A', 'texto B'), [2,0,1])` e renumere.
- Se a página estiver publicada, após salvar pergunte se pode publicar. Com o "pode publicar": `/landing-pages/<id>/editar?page=6` → **Aplicar alterações** → confira o HTML no ar (`curl -sL <url>?nc=...`) procurando um trecho da mudança.

## 9. Entrega
Resuma para o usuário: o que foi montado (seções, o que é nativo × HTML), imagens enviadas, o que foi verificado (e como), o que **não** foi possível verificar, e as decisões pendentes (Configurações, publicação). Feche as abas que você abriu.
