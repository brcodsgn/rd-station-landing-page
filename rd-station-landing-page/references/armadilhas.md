# Armadilhas do editor Bricks (RD Station) — e como contornar

Cada item abaixo custou tempo real num projeto. Leia antes de montar e consulte quando algo "não aplicar".

## Renderização
| Sintoma | Causa | Solução |
|---|---|---|
| Espaçamento vertical entre seções não aparece | O HTML publicado **ignora `padding` da linha (row)** | Aplicar o respiro no `padding` das **colunas** (o `RDB.row` já faz isso) |
| No celular, textos deslocados para a esquerda/fora do centro | O RD **não aplica o `align` mobile dos textos**; eles ficam `align-self:flex-start` com largura fixa | CSS de página: `@media (max-width:767px){.rd-text{align-self:center!important;width:100%!important;max-width:100%!important}}` (em `RDB.baseCSS`). **Não** estender para `.rd-button/.rd-html/.rd-image`: estica botões e zera a largura de blocos HTML |
| No editor os textos aparecem todos em negrito | Só visual do canvas do editor | Ignorar; conferir na pré-visualização |
| Texto do botão do formulário grudado no topo | Botão é flex sem `align-items` | `.rd-button,.bricks-form__submit .rd-button{display:flex;align-items:center;justify-content:center}` |
| `height` numérico em caixa (box) ignorado | Renderizador não emite altura de caixa | Aceitar alturas diferentes ou resolver no conteúdo |
| Largura da página | `properties.width` da página (padrão 960). 1140 funciona bem | `RDB.page({width:1140})` |

## Animações (CSS/JS próprios)
| Sintoma | Causa | Solução |
|---|---|---|
| Elementos do rodapé nunca aparecem | Revelação por scroll com `rootMargin` negativo: o fim da página nunca cruza a linha | Rodapé fora da revelação + checagem por scroll que revela tudo ao chegar no fim (em `RDB.baseJS`). Conteúdo nunca pode depender só do observer |
| "Pulo" logo após a entrada de um elemento flutuante | Segunda animação com `alternate-reverse` começa do valor final | Usar `alternate` e keyframes que partem do mesmo ponto onde a entrada termina |
| Painel com texto cortado no topo (cards com conteúdo sobreposto) | `justify-content:flex-end` + conteúdo maior que o card | `justify-content:flex-start; overflow-y:auto` e `margin-top:auto` no 1º filho (alinha embaixo quando cabe, começa no topo quando não cabe). Testar em 320–1280px |
| Rolagem por âncora não funciona na pré-visualização | A prévia rola um contêiner externo, não `window` | Usar `el.scrollIntoView({behavior:'smooth'})`, nunca `window.scrollTo` |
| Rolagem lateral no celular depois de um bloco animado | Elementos esperando fora de cena (peças que entram pela lateral, grupo deslocado com `translateX`) aumentam a largura da página | **Não** usar `overflow:hidden` no contêiner do efeito: ele vira máscara e corta peças e sombras durante a animação. Conter na página: `html{overflow-x:hidden}` + `@supports (overflow:clip){html,body{overflow-x:clip}}` (já em `RDB.baseCSS`). Conferir na prévia mobile `documentElement.scrollWidth === innerWidth` com a peça no ponto mais distante |
| Peças/sombras cortadas durante a animação, "como se tivesse uma máscara" | `overflow:hidden` no contêiner do efeito recorta tudo que passa da caixa | Tirar o `overflow` do efeito e conter só na página (`html{overflow-x:hidden}` + `@supports (overflow:clip){html,body{overflow-x:clip}}`) |
| `z-index` de um elemento decorativo não o coloca atrás/na frente do grupo animado | O grupo vizinho não tem contexto de empilhamento próprio (ou só ganha um quando a animação começa) | Dar `position:relative;z-index:N` explícito ao wrapper do grupo e `z-index` menor/maior aos decorativos |
| Elemento decorativo vira "fora da tela" no celular | Posições negativas (`right:-12%`) pensadas para desktop | Regras mobile próprias (`@media (max-width:767px)`) e medir `getBoundingClientRect()` na prévia mobile (0 ≤ left, right ≤ 480) |
| Scripts em blocos HTML | Executam na página publicada e na prévia; não no canvas do editor | Validar na prévia |

## Salvamento e estado
| Sintoma | Causa | Solução |
|---|---|---|
| "Salvei" mas o servidor não tem a mudança | `setDesign` não marca o editor como alterado **e** existem **dois botões "Salvar"** (o React costuma estar `disabled`) | `RDB.apply(d)` e depois `RDB.save()` (clica `#save-btn`). Sempre `RDB.verify(id, trecho)` — só diga "salvo" após o servidor confirmar (PUT `/landing-pages/<id>/content/<id>` → 200) |
| Editor/resumo da LP respondem 500/502 | A LP foi **duplicada/renomeada/excluída** pela equipe (ou instabilidade do RD) | Abrir `/landing-pages` e localizar a LP atual pelo nome/link; conferir ID antes de editar |
| URL publicada dá 404 | LP renomeada/duplicada muda o slug | Pegar o endereço atual na lista |
| Sobrescrever ajuste feito pela equipe | A equipe edita no editor (troca imagem, texto) | Antes de substituir um componente, comparar (`RDB.stripStyle`) e preservar as diferenças |
| `/landing_pages` dá 502 | Rota antiga | Usar `/landing-pages` |

## Navegação no RD
- Editor: `/landing-pages/<id>/editar` (não `/editor`, que dá 502). Configurações: `?page=5` (mostra o endereço publicado e a ação do formulário). Publicação: `?page=6` → botão **Aplicar alterações** (só com autorização explícita).
- Depois de publicar, confira a página no ar baixando o HTML (`curl -sL <url>?nc=<aleatório>`) e procurando um trecho único da mudança.
- A pré-visualização tem botões **Desktop/Mobile**; o clique às vezes não pega. Confirme pela largura do iframe (`offsetWidth` 480 = mobile) e clique de novo pelo `ref` do `find`.
- Depois de salvar, a aba do editor recarrega: espere `bricksEditor.exportDesign` existir de novo antes do próximo comando.
- Sessão do RD expira: se o editor cair em `accounts.rdstation.com` (tela de login), pare e peça para o usuário logar. Nunca faça login por ele.
- O editor pode estar com **Salvamento automático** ligado: alterações temporárias (ex.: seção para upload) podem ser gravadas sozinhas — remova-as antes de terminar.

## Desempenho (Lighthouse)
- Medir: a API do PageSpeed costuma estar sem cota; rode local com o Chrome instalado: `CHROME_PATH=".../Google Chrome" npx -y lighthouse@12 <url> --chrome-flags="--headless=new" --output=json --output-path=lh.json --only-categories=performance,accessibility,best-practices,seo` (celular é o padrão; `--preset=desktop` para desktop). Rode 2x: a nota oscila.
- Leia `audits.metrics.details.items[0].observed*` além da nota. No caso real: LCP **observado** 0,8 s × **simulado** 11,5 s. A diferença eram 4,3 MB de imagens que começavam a baixar antes do LCP — na simulação de 4G elas "atrasam" o título. O vilão era peso de imagem, não JS.
- Imagens: WebP, largura ≈ 2× a maior exibida, ≤ 100 KB (fundos até ~150). Sem `cwebp` no Mac, use `scripts/webp/` (encoder do Chrome; mantém transparência). Compare original × WebP lado a lado antes de subir. Resultado típico: −90% de peso sem diferença visível.
- O uploader do RD aceita **um arquivo por vez** (modal fecha sozinho e a URL fica no componente selecionado). Use uma seção temporária com um componente Imagem, repita "Carregar imagem" → `find` do input → `file_upload` → ler a URL, e confira todas byte a byte no CDN. Troque as URLs no design inteiro com `RDB.swapUrls` (pega componentes, blocos HTML e fundos de seção) e remova a seção temporária.
- Imagens que só aparecem depois (peças de um loop, carrossel): `data-src` + `RDB.deferImagesJS()` (carregam após o `load`). Abaixo da dobra em blocos HTML: `loading="lazy" decoding="async"` + `width/height`. As imagens nativas do RD já saem com `loading="lazy"`.
- Primeira dobra: `RDB.preloadHead([...])` no `javascriptHead` (fundo da seção do topo + imagens visíveis de início) e `fetchpriority="high"` só nelas.
- **Título e meta description** publicados vêm de **Configurações → Endereço (link) e informações da página** (`?page=5`), não de `properties.title/description` do design. Se ficarem vazios, a página sai com `<title></title>` (perde em SEO e acessibilidade). Peça autorização e preencha.
- Acessibilidade do formulário nativo: os campos anti-spam (`emP7yF13ld`, `sh0uldN07ch4ng3`) não têm label e o select2 do campo Cidade gera `href="javascript:"` e `role` inválido → `RDB.formA11yJS()` no `jsBody`.
- O que **não** adianta/ não dá: `display=swap` (o RD já usa nas fontes Google); recarregar select2/jQuery (o RD já carrega no `<head>`, bloqueando a renderização — não dá para adiar pela página); cookies de terceiros e avisos de CSP no console (RD/Facebook); pixels e GA da conta. Esses limitam o Desempenho no celular a ~75 mesmo com a página otimizada (desktop ~90+).

## Rastreamento (pixel)
- O RD injeta no fim do `<body>` de **todas** as LPs o pixel configurado na **conta** (integração do Facebook). Ele não aparece no design da LP nem nas Configurações da página. Trocar ali afeta todas as LPs: decisão da equipe.
- Ordem no HTML publicado: handler do RD (`window.conversionSuccess`: agradecimento + `top.location.href = redirectTo`) → `javascriptBody` da página → pixel da conta. Por isso dá para, só nesta LP, iniciar outro pixel e envolver `conversionSuccess` para disparar o `Lead` antes do redirecionamento: `RDB.metaPixelJS(id, {event, params})`.
- Use `trackSingle` para o evento não cair também no pixel da conta.
- Teste sem enviar formulário real: página local que imita a ordem (handler falso → snippet → pixel da conta), chame `conversionSuccess()` e leia `fbq.queue` (se o `fbevents.js` for bloqueado no navegador de teste, as chamadas ficam na fila na ordem exata). Confirmação final: Gerenciador de Eventos → Testar eventos, com um envio real feito pela equipe.

## Injeção de código na aba do editor
- `<script src="http://localhost...">` é **bloqueado** (página HTTPS). Colar 30 KB+ no `javascript_tool` é frágil.
- Use o **loader de arquivo**: crie um `<input type=file>` na página, envie o `.js` com `file_upload`, leia com `file.text()` e execute com `(0,eval)(code)`. Snippet no SKILL.md.

## Edição pontual
- Reordenar cards/colunas: troque o **conteúdo** das colunas (`RDB.reorderColumns(RDB.findRow(d,'texto do card 1','texto do card 2'), [2,0,1])`), não as colunas — mantém padding e tamanho de cada posição. Renumere textos como "01/02/03" se houver.
- Ajuste fino de posição/estilo: teste primeiro injetando um `<style>` com `!important` no iframe da prévia (`RDB.previewDoc()`), meça/fotografe, e só então grave o valor no bloco.
- Para capturas e medições, congele as animações no estado final: `RDB.freezeAnimations(RDB.previewDoc(), '.minha-classe *')`.
- Ao localizar um bloco HTML por marcador (`RDB.findHtml`), use um trecho que só existe **no HTML daquele bloco** (ex.: `<div class="ex-pz"`), não um nome de classe que o script de outro bloco também cita — senão você compara/substitui o bloco errado.
- Antes de trocar um bloco, compare com a sua última versão; se diferir, descubra o que a equipe mudou antes de sobrescrever.

## Upload de imagens
- O uploader do RD só funciona com o modal aberto: selecione um componente **Imagem** → **Carregar imagem** → `find` o `input[type=file]` do modal → `file_upload`. A imagem entra no componente selecionado; leia a URL em `exportDesign()`.
- As refs do input mudam a cada abertura do modal: faça `find` de novo a cada arquivo.
- Aceita jpg/png/gif/webp/avif (não aceita svg/woff). Confira cada URL baixando e comparando o tamanho em bytes com o arquivo local.
- Use um componente de imagem "descartável" (ou uma LP-rascunho "banco de imagens") para os uploads; depois volte a imagem original.

## Formulário
- Campos personalizados são **da conta** (ex.: `custom_fields[1234567]` / `cf_registro`). Não invente campos: clone do formulário de outra LP (`RDB.listFormFields()`); se faltar algum, peça para a equipe criar em Configurações > Campos.
- O formulário do RD já traz máscara de telefone (INTERNATIONAL_MASK), cidade com autocomplete e captcha matemático. Máscara de CPF/CNPJ: script por `name`.
- Redirecionamento pós-envio, mensagem de agradecimento, reCAPTCHA, LGPD e redes sociais ficam na etapa **Configurações** da LP — decisões da equipe; pergunte.
