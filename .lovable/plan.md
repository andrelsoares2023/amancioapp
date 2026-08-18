# AMANCIOapp — agendamentos com backend, dia da semana automático e nova identidade

Atualização pontual do projeto atual. Nenhuma funcionalidade existente é removida: professores, turmas, quadro de horários, calendário letivo 2026, tema claro/escuro, offline e guia de instalação permanecem como estão.

## Onde as coisas estão hoje (verificado)

- O app inteiro é o arquivo único `public/app/index.html`, exibido pela rota `src/routes/index.tsx`.
- Os agendamentos são gravados **apenas no LocalStorage do aparelho** (linhas 219–220: `DB.books.{video,chrome,lab}`).
- A validação de conflito está na linha 425, dentro do `submit` do formulário: compara só `data` + `aula`.
- **Não existe hoje** backend, banco, API, Supabase nem migrations no projeto.
- O formulário **não tem campo de Turno** — essa é a causa real do bug: a 1ª aula da manhã e a 1ª aula da tarde chegam ao validador como o mesmo "1ª Aula" na mesma data, então a segunda é recusada.

## 1. Nova camada de backend (Lovable Cloud)

Ativar o backend e criar a tabela de reservas, para que a regra seja garantida no banco e as reservas fiquem compartilhadas entre todos os professores da escola:

- Tabela `bookings`: `id`, `recurso` (video | chrome | lab), `data` (date), `turno` (matutino | vespertino | null), `aula` (1..5), `dia_semana`, `professor`, `componente`, `turma`, `objetivo`, `delete_token`, `origem_local_id`, `revisar` (boolean), `created_at`.
- **Índice único em (recurso, data, turno, aula)** — é isso que impede fisicamente duas reservas do mesmo recurso no mesmo horário, mesmo com dois professores salvando ao mesmo tempo. A tentativa duplicada volta como erro do banco e é traduzida em mensagem de conflito na tela.
- RLS ativada com os GRANTs correspondentes: leitura e criação liberadas (o app não tem login, conforme a regra "zero login" atual), **exclusão bloqueada para o público** — nenhuma política permite DELETE pelo cliente.
- API HTTP em `src/routes/api/public/bookings.ts` (GET listar, POST criar, DELETE remover) com validação Zod do turno/aula/data e tratamento do erro de unicidade. O app único em `public/app/index.html` consome essa API com `fetch`.

### Proteção da exclusão (sem login)

- Ao criar a reserva, o servidor gera um **token secreto de exclusão** e o devolve apenas para quem criou; o app guarda esse token no aparelho junto da reserva. O token nunca aparece na listagem pública.
- O DELETE só é aceito com `id` + token correto, conferido no servidor. Sem o token, a requisição é recusada com 403 — logo, ninguém pode varrer a API apagando reservas de terceiros.
- A exclusão continua acontecendo pelo mesmo botão de lixeira, sem nenhuma mudança para o professor: quem criou a reserva no próprio aparelho tem o token e apaga normalmente.
- Para os casos em que a coordenação precisa remover uma reserva feita em outro aparelho, o DELETE também aceita uma senha administrativa guardada como segredo no servidor, pedida em um prompt simples dentro da aba Configurações. Isso não é login de professor e não altera o fluxo normal de uso.
- Rate limit simples por IP nas rotas de criação e exclusão, para evitar abuso automatizado.
- **Modo offline preservado**: o LocalStorage continua funcionando como cache/fallback. Sem internet o app mostra as reservas já sincronizadas e avisa que a confirmação definitiva ocorre ao reconectar; com internet, o banco é a fonte da verdade.

### Migração das reservas existentes (sem perda)

- Cada reserva do LocalStorage é enviada ao backend uma única vez, identificada por `origem_local_id` (o `id` atual), o que evita duplicar em reenvios.
- Turno inferido **somente quando seguro**: turma terminando em `.01` = matutino, `.02` = vespertino. Sem esse padrão, o turno vai como nulo e a reserva é marcada com `revisar = true`, aparecendo na lista com um aviso "confirmar turno" — nunca com um valor inventado.
- Nenhuma reserva é apagada, sobrescrita ou descartada. Duplicatas de horário que o índice único recusar são preservadas no aparelho e mostradas como pendentes de resolução manual, com a mensagem do motivo.
- O LocalStorage permanece intacto como backup durante todo o processo; a reserva só é marcada como sincronizada depois que o backend confirma a gravação (resposta com o `id` do banco). Em caso de falha, a reserva continua local e a tentativa é repetida na próxima abertura.


## 2. Regra de conflito correta (frontend + banco)

- Novo campo **Turno** (Matutino / Vespertino) obrigatório no formulário; turmas e professores filtrados pelo turno escolhido (manhã: 62.01, 72.01, 82.01, 92.01 / tarde: 62.02, 82.02, 92.02).
- Conflito = mesmo **recurso** + mesma **data** + mesmo **turno** + mesma **aula**. Qualquer diferença em um desses quatro é permitida.
- Checagem imediata na tela (mensagem antes de enviar) e barreira definitiva no índice único do banco.
- Turno passa a aparecer no cartão de cada reserva e nos lembretes da Home.

## 3. Dia da semana automático

- O `<select>` "Dia da semana" vira campo **somente leitura**, calculado da data com data local (`new Date(ano, mês-1, dia)` a partir das partes de `YYYY-MM-DD`), sem desvio de fuso.
- Recalcula imediatamente a cada troca de data; sábado/domingo exibidos com aviso de dia não letivo.
- O valor gravado é sempre coerente com a data. Reservas antigas com dia divergente continuam salvas e passam a exibir o dia correto derivado da data.

## 4. Nome e logomarca AMANCIOapp

- Nome atualizado em: título da página, cabeçalho do app, texto das notificações, guia de instalação, `public/app/manifest.webmanifest` (`name`/`short_name`) e o `head()` de `src/routes/index.tsx`.
- A imagem enviada passa a ser a logo oficial: ícones do PWA 192px e 512px gerados dela em formato quadrado, sem esticar nem cortar; favicon do navegador (`public/favicon.png` + link em `src/routes/__root.tsx`); logo no cabeçalho do app e no cartão de boas-vindas. Não existe tela de login.
- `public/app/sw.js` recebe nova versão de cache para que aparelhos já instalados baixem os arquivos novos.
- Nenhuma URL, escopo do PWA ou integração é alterada.

## 5. Testes que serão executados

Automatizados no navegador contra o app rodando, mais checagem direta no banco:
- A: 24/08/2026 manhã 1ª aula Sala de Vídeo + tarde 1ª aula Sala de Vídeo → ambos aceitos.
- B: repetir 24/08/2026 manhã 1ª aula Sala de Vídeo → recusado (na tela e pelo índice único, testado também por duas gravações simultâneas).
- C: manhã 1ª aula + manhã 2ª aula, mesmo recurso → ambos aceitos.
- E: mesma data/turno/aula em Sala de Vídeo e Chromebooks → ambos aceitos.
- D: 24/08/2026 → "Segunda-feira"; trocar a data recalcula; campo não editável.
- F: logo no cabeçalho, favicon, ícones do PWA e nome AMANCIOapp no manifest.

## Arquivos e camadas alteradas

| Camada | Arquivo |
| --- | --- |
| Banco | migration: tabela `bookings`, índice único `(recurso, data, turno, aula)`, RLS + GRANTs |
| API | `src/routes/api/public/bookings.ts` (GET/POST/DELETE com validação e erro de conflito) |
| App | `public/app/index.html` (campo Turno, validação, dia automático, sincronização com a API, logo, nome) |
| PWA | `public/app/manifest.webmanifest`, `public/app/sw.js`, `public/app/icon-192.png`, `public/app/icon-512.png` |
| Site | `src/routes/index.tsx` (título/meta), `src/routes/__root.tsx` + `public/favicon.png` |

Nada é recriado do zero e a integração de deploy existente não é tocada.
