# Atualização pontual: conflitos, dia da semana, nome e logo

Apenas o app existente em `public/app/` (arquivo único) e o título da rota React serão ajustados. Nada de estrutura, dados salvos, professores, turmas, horários ou calendário será removido.

## 1. Regra de conflito (Data + Turno + Aula + Recurso)

Causa do problema atual: o formulário de reserva não tem campo de **Turno**, e a validação compara apenas `data` e `aula` dentro do recurso. Por isso "1ª aula" da manhã e "1ª aula" da tarde são tratadas como o mesmo horário.

Correção:
- Adicionar o campo **Turno** (Matutino / Vespertino) no formulário de reserva, obrigatório.
- A lista de turmas passa a filtrar pelo turno escolhido (manhã: 62.01, 72.01, 82.01, 92.01 / tarde: 62.02, 82.02, 92.02), e a lista de professores mostra quem atua no turno.
- Conflito passa a ser: mesmo recurso **e** mesma data **e** mesmo turno **e** mesma aula. Qualquer diferença em um desses quatro itens é permitida.
- Reservas já salvas não têm turno gravado: o turno delas será inferido da turma (sufixo `.01` = matutino, `.02` = vespertino) apenas na hora de comparar e exibir, sem reescrever nem apagar nada.
- O turno também aparece no cartão de cada reserva salva e nos lembretes.

Observação importante: hoje o app é 100% offline e grava as reservas no próprio aparelho (LocalStorage), sem banco de dados nem servidor. Portanto não existe camada de backend onde aplicar a regra, e não há reservas compartilhadas entre dois usuários ao mesmo tempo. A validação corrigida é a única barreira possível nessa arquitetura. Se você quiser que as reservas sejam compartilhadas entre professores no mesmo servidor, com bloqueio garantido no banco (índice único em recurso + data + turno + aula), isso é um segundo passo que exige ativar o backend do app — me diga se quer que eu inclua.

## 2. Dia da semana automático

- O `<select>` "Dia da semana" vira um campo somente leitura, preenchido automaticamente a partir da data.
- Cálculo com data local (`new Date(ano, mês-1, dia)` a partir das partes de `YYYY-MM-DD`), evitando o deslocamento de fuso que faz cair no dia anterior.
- Atualiza na hora a cada mudança de data; sábado/domingo são mostrados com aviso de dia não letivo.
- O valor gravado passa a ser sempre coerente com a data. Reservas antigas continuam intactas e, quando o dia gravado divergir da data, o cartão mostra o dia correto calculado da data.

## 3. Nome AMANCIOapp

Atualizar em: título da página, cabeçalho do app, texto de notificação, guia de instalação (aba Configurações), `manifest.webmanifest` (`name` e `short_name`) e o `head()` da rota `src/routes/index.tsx`. Nenhuma URL, escopo do PWA ou funcionalidade muda.

## 4. Logomarca oficial

A imagem enviada passa a ser a logo oficial:
- Ícones do PWA 192px e 512px gerados a partir dela, quadrados, sem esticar nem cortar (fundo verde da própria imagem preenche as bordas).
- Favicon do navegador a partir da mesma imagem.
- Logo exibida no cabeçalho do app (marca circular ao lado do título) e no cartão de boas-vindas da Home. Não existe tela de login.
- `sw.js` com nova versão de cache para que os aparelhos já instalados recebam os arquivos novos.

## 5. Testes que serão executados

Automatizados no navegador, sobre o app rodando:
- A: 24/08/2026 manhã 1ª aula Sala de Vídeo + tarde 1ª aula Sala de Vídeo → ambos aceitos.
- B: repetir 24/08/2026 manhã 1ª aula Sala de Vídeo → segundo recusado com mensagem de conflito.
- C: manhã 1ª aula + manhã 2ª aula, mesmo recurso → ambos aceitos.
- E: mesma data/turno/aula em Sala de Vídeo e Chromebooks → ambos aceitos.
- D: escolher 24/08/2026 → mostra "Segunda-feira"; trocar a data → recalcula; campo não editável.
- F: conferência visual da logo no cabeçalho, favicon, ícones e nome AMANCIOapp no manifest.

## Detalhes técnicos

Arquivos alterados: `public/app/index.html` (campo Turno, `bkForm.onsubmit`, `renderBooks`, `renderReminders`, cabeçalho, textos), `public/app/manifest.webmanifest`, `public/app/sw.js` (versão do cache), `public/app/icon-192.png` / `icon-512.png`, `public/favicon.png` + `src/routes/__root.tsx` (link do favicon), `src/routes/index.tsx` (título/meta). Reservas existentes em LocalStorage permanecem na mesma chave e formato, com campos novos opcionais.
