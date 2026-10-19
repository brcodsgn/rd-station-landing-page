# RD Station Landing Page — skill para o Claude

Skill do Claude que replica uma landing page (HTML pronto, protótipo, KV ou referência visual) como página **nativa** no editor de Landing Pages do **RD Station Marketing** (editor Bricks). A página final fica editável pela equipe no próprio RD, com o **formulário nativo** do RD.

> **English:** A Claude skill that rebuilds a landing page (finished HTML, prototype, key visual or visual reference) as a **native** page in RD Station Marketing's Landing Page editor (the Bricks editor). It drives the user's Chrome, already logged in to RD: it builds sections, text, images, buttons, boxes and RD's native form as JSON (`bricksEditor.setDesign`), uploads images through RD's uploader, uses HTML only for special effects, then saves and verifies the result on the server.

## O que ela faz
- Monta seções, linhas, colunas, textos, imagens, botões, caixas e o formulário do RD por JSON (`bricksEditor.setDesign`), clonando componentes reais da conta.
- Sobe imagens pelo uploader do RD e confere cada uma byte a byte.
- Usa blocos HTML só para efeitos que o editor não faz (animações, cards com hover, texto digitando).
- Salva, verifica no servidor e confere desktop e mobile na pré-visualização.
- Corrige os problemas conhecidos do renderizador do RD (alinhamento mobile, padding de linha ignorado, rolagem suave, revelação ao rolar, rolagem lateral).
- Opcional: pixel da Meta só na LP, com evento `Lead` antes do redirecionamento do formulário.

## Requisitos
- Claude com a extensão **Claude in Chrome**.
- Chrome logado no RD Station Marketing (a skill nunca digita senha nem faz login).
- Publicar a LP e mudar Configurações (redirecionamento, reCAPTCHA, LGPD etc.) só com autorização explícita.

## Instalação
Copie a pasta `rd-station-landing-page/` para a pasta de skills do Claude:

```bash
git clone https://github.com/brcodsgn/rd-station-landing-page.git
```

```bash
cp -R rd-station-landing-page/rd-station-landing-page ~/.claude/skills/
```

No app do Claude, também dá para compactar a pasta (`.zip` renomeado para `.skill`) e enviar em Configurações → Skills.

## Estrutura
| Arquivo | Conteúdo |
|---|---|
| `SKILL.md` | Fluxo passo a passo (planejar, imagens, montar, salvar, verificar, ajustes, publicação) |
| `scripts/bricks-builder.js` | Biblioteca `window.RDB` injetada na aba do editor |
| `references/armadilhas.md` | Problemas reais do editor/renderizador do RD e como contornar |
| `references/formato-bricks.md` | Formato observado do JSON do editor Bricks |
| `examples/exemplo-lp-completa.js` | LP completa de exemplo (marca fictícia) |

## Aviso
Projeto independente, sem vínculo com a RD Station. O formato interno do editor não é documentado e pode mudar.

## Licença
MIT
