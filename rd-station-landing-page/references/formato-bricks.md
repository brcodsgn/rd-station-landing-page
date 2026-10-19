# Formato do design Bricks (observado)

O editor guarda a LP em `window.landingPageDesign` (também embutido no HTML de `/landing-pages/<id>/editar`). API no navegador: `bricksEditor.exportDesign()`, `bricksEditor.setDesign(obj)`, `bricksEditor.isDirty()`.

```
page {properties:{id, css, title, width, isFluid, keywords, className, enable_seo, description, javascriptHead, javascriptBody}}
└─ section {border, className:'rd-section', background, mobileProperties}
   └─ row {padding (IGNORADO no render), minHeight, className:'rd-row'}
      └─ column {size (1–12, soma 12 por linha), padding, background, alignInside:{vertical}, mobileProperties:{padding}}
         ├─ text   {align, width(px), height:'auto', margin:{top,bottom}, border, content(HTML c/ estilos inline), mobileProperties:{align,width,content,isActive}}
         ├─ image  {url, link, align, width, height, border(radius), description(alt), mobileProperties{..., aspectRatioLocked}}
         ├─ button {type:'button'|'submit', label, link:{href,type:'web',target}, font{bold,size,color,family}, width, height, border, boxShadow, background, mobileProperties}
         ├─ box    {align, width, height, padding, border, background, children:[...]}
         ├─ html   {content, className:'rd-html'}          ← só content/id/className
         └─ form   {fields{font,border,height,columns,spacing,background}, labels{font}, width, mobileProperties}
              ├─ fieldset {form_multi_step, progressive_profiling, children:[campos]}
              │    campos: TEXT_FIELD | EMAIL_FIELD | PHONE_FIELD | SELECT_FIELD | CAPTCHA_FIELD
              │    {id, name ('name','email','uf','city_id','custom_fields[123]'), label, required, use_type, api_identifier, options[], input_mask}
              └─ button (type:'submit')
```

- IDs: `rd-<tipo>-<8 chars base36>`. Viram `id` no HTML publicado → dá para mirar com CSS (`#rd-box-abc`) e usar como âncora (`href="#rd-box-abc"`).
- Classes publicadas: `.rd-section`, `.rd-row`, `.bricks--column`, `.rd-text`, `.rd-image`, `.rd-button`, `.rd-box`, `.rd-html`, `.bricks-form__submit`.
- `mobileProperties.isActive:true` ativa a versão mobile do componente (breakpoint ~480/767px), mas o `align` mobile de texto não é respeitado (ver armadilhas).
- Fundo de seção com imagem: `background:{type:'image', url, cover:true, position:{x:50,y:50}}`.
- Texto: use `<h1>/<h2>/<h3>/<p>` com `style="text-align; line-height"` e `<span style="font-family; font-size; color; font-weight">`.
