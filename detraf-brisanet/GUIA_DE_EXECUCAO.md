# 📘 Guia de Execução: Automação DETRAF/DEROAM (brisanet)

Este guia explica como instalar, autorizar e executar os dois conjuntos de código deste projeto no Google Apps Script. Ele descreve o comportamento **atual** do código (versão importada neste repositório, sem alterações). Os pontos que merecem correção estão em [⚠️ Pontos de atenção](#️-pontos-de-atenção-conhecidos).

---

## 📌 Visão Geral

```
[Gmail: e-mails DETRAF] ──► ValorCredor.gs ───────────────┐
                            (anexos → Drive → soma → col. I)│
[Upload manual dos DETRAF] ► Auditor (Web App) ────────────┤──► Planilha "Controle - DETRAF E DEROAM"
                            (padroniza → Drive → col. I/J) │       │
[Leitor externo de NF] ────► NF_SOMA.gs (Web App doPost) ──┤       │
[Gmail: tickets FAT-/CAP-] ► NF_Ticket.gs ─────────────────┘       ▼
                                                      DadosFaturamento.gs
                                                      (aba "DADOS PARA FATURAMENTO")
```

| Pasta | Arquivo | Função principal | Como é acionado |
|---|---|---|---|
| `automacao-planilha/` | `ValorCredor.gs` | `atualizarDetrafPlanilha` (e `onOpen`, que cria o menu) | menu **🚀 ATUALIZAR DETRAF** |
| `automacao-planilha/` | `NF_Ticket.gs` | `atualizarNFPlanilha` | menu **🚀 ATUALIZAR DETRAF** |
| `automacao-planilha/` | `NF_SOMA.gs` | `doPost` / `doGet` | Web App (chamada HTTP de outro sistema) |
| `automacao-planilha/` | `DadosFaturamento.gs` | `buscarDadosDetrafV3` | manual, pelo editor (não há item de menu) |
| `auditor-web-app/` | `Codigo.gs` + `Index.html` | `doGet` (abre a tela) | Web App, no navegador |

---

## 🛠️ PARTE 1: Automação da planilha (`automacao-planilha/`)

### 1.1. Instalar o código
1. Abra a planilha de controle no Google Sheets e vá em **Extensões** > **Apps Script**.
2. Crie um arquivo de script para cada `.gs` da pasta (`ValorCredor`, `NF_Ticket`, `NF_SOMA`, `DadosFaturamento`) e cole o conteúdo. Os quatro podem ficar no mesmo projeto, porque não há funções com o mesmo nome entre eles.
3. Salve com `Ctrl + S`, recarregue a planilha (**F5**) e aguarde o menu **🚀 ATUALIZAR DETRAF** aparecer.

### 1.2. Conferir as configurações no código
| O quê | Onde | Observação |
|---|---|---|
| Nome da aba de controle | `NOME_ABA` (`ValorCredor.gs`) | precisa ser exatamente `Controle - DETRAF E DEROAM` |
| Pasta dos CSV / pasta dos XLS / pasta dos RTF | `ID_PASTA_DADOS`, `ID_PASTA_EXTRA`, `ID_PASTA_RESUMO` (`ValorCredor.gs`) | a conta que executa precisa ter acesso às três pastas |
| Regras de assunto de e-mail | `MAPA_OPERADORAS` (`ValorCredor.gs`) | combina tipo Brisanet + operadora + tipo da relacionada com o assunto do e-mail |
| URL base do Jira | `URL_JIRA_BASE` (`NF_Ticket.gs`) | usada para montar o link de cada ticket |
| Planilha de origem do relatório | `urlOrigem` (`DadosFaturamento.gs`) | lida pela função `buscarDadosDetrafV3` |

### 1.3. Primeira autorização
1. No editor, escolha `onOpen` na lista de funções e clique em **Executar**.
2. Em **Autorização necessária**, clique em **Revisar permissões** e escolha a conta corporativa.
3. Se aparecer *"O Google não verificou este app"*, clique em **Avançado** > **Acessar projeto (não seguro)** > **Permitir**.
4. Os scripts pedem acesso a **Planilhas**, **Drive** e **Gmail**. Para o relatório de faturamento (`DadosFaturamento.gs`), a conta também precisa ter acesso de leitura à planilha de origem.

### 1.4. Rotina de execução (ordem sugerida)
> A ordem segue as dependências entre os dados; ajuste à sua rotina real.

1. **Valores do DETRAF:** menu **🚀 ATUALIZAR DETRAF** > **🔄 Executar Atualização de Valores** (`atualizarDetrafPlanilha`).
   * Percorre as linhas da aba de controle com a coluna **I vazia** (ou `R$ 0,00`) e período `AAAAMM` na coluna **G**.
   * Para cada linha, busca no Gmail o e-mail da regra correspondente (até 15 conversas), salva os anexos nas pastas do Drive (ZIP é descompactado; PDF e anexos que começam com `NF` são ignorados), soma o valor e grava na coluna **I**.
   * Ignora linhas `ROAMING`. Ao final, mostra um alerta com a quantidade de linhas preenchidas.
2. **Notas fiscais por API:** o leitor externo envia cada nota para o Web App `NF_SOMA` (ver 1.5). Isso preenche a aba **NF** e faz a conferência com a aba de controle.
3. **Tickets do Jira:** menu **🚀 ATUALIZAR DETRAF** > **💲 Executar Atualização de NFs (Jira)** (`atualizarNFPlanilha`).
   * **FAT-:** lê os e-mails `subject:FAT-` (DETRAF, DEROAM, BROKER, MOVEL, SMP, STFC), grava o link do ticket e o status na linha correspondente.
   * **CAP-:** lê os e-mails `subject:CAP-`, procura a linha pelo valor do encontro de contas e grava o link e a data de pagamento.
   * Ao final, mostra (ou registra no log, quando não há tela) a contagem de chamados FAT e CAP vinculados.
4. **Relatório de faturamento:** no editor, selecione `buscarDadosDetrafV3` e clique em **Executar**. Ele recria a aba **DADOS PARA FATURAMENTO** (blocos STFC, SMP e Brokers) a partir da planilha de origem. A aba precisa existir antes de rodar.

### 1.5. Web App de notas fiscais (`NF_SOMA.gs`)
1. No editor, clique em **Implantar** > **Nova implantação** > tipo **App da Web**.
2. Defina **Executar como: Eu** e o **Acesso** conforme a política da empresa. Copie a URL terminada em `/exec`.
3. Teste a conexão abrindo a URL no navegador: deve aparecer `API do Google Apps Script ativa!`.
4. O sistema que envia as notas deve fazer um `POST` com JSON neste formato:

```json
{
  "periodo": "202609",
  "operadora": "CLARO",
  "valor": "1.234,56",
  "arquivo": "nota_exemplo.pdf"
}
```

5. A resposta é `{"status":"success", ...}` ou `{"status":"error", ...}`. A nota é gravada na aba **NF** (criada se não existir) e a soma da operadora e do período é comparada com a aba de controle (tolerância de R$ 0,05).
6. Depois de alterar o código, publique uma **nova versão** (**Implantar** > **Gerenciar implantações** > editar > **Nova versão**). Sem isso, a URL `/exec` continua servindo a versão antiga.

### 1.6. Execução automática (opcional)
* `atualizarNFPlanilha` já funciona sem tela (usa o log quando não há interface), então pode rodar por gatilho de horário (**Gatilhos** > **Adicionar gatilho** > baseado em tempo).
* `atualizarDetrafPlanilha` e `buscarDadosDetrafV3` terminam com `SpreadsheetApp.getUi().alert(...)`, que **falha em gatilhos**. Para automatizá-los, troque o alerta por `Logger.log` antes.
* Cada execução tem limite de **6 minutos**. Com muitas linhas pendentes, rode por partes.

---

## 🌐 PARTE 2: Auditor Inteligente DETRAF GFX (`auditor-web-app/`)

### 2.1. Instalar o código
1. Acesse [script.google.com](https://script.google.com) e crie um projeto novo (ou use um existente só do Auditor).
2. Cole o conteúdo de `Codigo.gs` no arquivo de script.
3. Crie um arquivo **HTML** com o nome exatamente **`Index`** e cole o conteúdo de `Index.html`. O nome importa, porque `doGet` abre `createHtmlOutputFromFile('Index')`.
4. Conferir as constantes no topo de `Codigo.gs`:

| Constante | Para que serve |
|---|---|
| `ID_PLANILHA_ANEXO5` | planilha com o mapa de EOT (EOT → operadora, UF, tipo) |
| `ID_PLANILHA_CONTROLE` e `NOME_ABA_CONTROLE` | planilha e aba de controle onde os valores são lançados |
| `ID_PASTA_RAIZ_PROJETO` | pasta raiz no Drive (`1- Projeto de DETRAF`) |

### 2.2. Publicar o Web App
1. **Implantar** > **Nova implantação** > **App da Web**.
2. Escolha o modo de execução:
   * **Usuário que acessa o app** (recomendado): cada pessoa usa as próprias permissões, e o e-mail dela é gravado na descrição dos arquivos criados (`Session.getActiveUser()`).
   * **Eu**: todos usam as permissões do dono, e o e-mail do usuário pode não aparecer.
3. Na primeira abertura, cada usuário autoriza **Planilhas** e **Drive**.
4. A cada mudança no código, publique uma **nova versão** da implantação. A URL `/dev` mostra o código mais recente, mas só serve ao dono.

> A tela carrega SheetJS, JSZip e Chart.js por CDN. O navegador precisa ter acesso à internet.

### 2.3. Como usar (aba **Processamento do Lote**)
1. Clique na área de upload ou arraste os arquivos (`.csv`, `.xls`, `.xlsx`, `.zip`). ZIPs são abertos no navegador; use o **X** para tirar arquivos da fila.
2. Clique em **Analisar Arquivos**. O sistema padroniza cada linha em 16 colunas, descarta cabeçalhos e subtotais (as linhas descartadas aparecem em "Ver Detalhes do Expurgo") e exige um único mês de referência por lote.
3. Revise as projeções (valor, chamadas, minutos e as tabelas de EOT credora e devedora). EOTs novas aparecem em laranja.
4. Confira **Operadora Parceira**, **Mês** e **Direção do Faturamento** (Recebimento ou Emissão).
5. Clique em **Salvar Lote no Drive e Exportar CSV**. Se já existir arquivo do mesmo mês, o sistema pergunta se deve substituir.
6. Na tela de sucesso:
   * **Baixar CSV Formatado** e **Abrir Pasta no Drive**;
   * modelo de e-mail com **Abrir Rascunho no Gmail** (só na direção Emissão);
   * a planilha de controle é atualizada sozinha. Em Recebimento, o valor vai para a coluna **J** (negativo) e, em Emissão, para a coluna **I**. Se a linha não for encontrada, use o botão **Lançar Automaticamente** de cada projeção.

Pastas criadas automaticamente: `Arquivos Padronizados / Detraf Recebido` ou `Detraf Enviado` / `Brisanet Fixo` ou `Brisanet Móvel` / `<Operadora>`, além de `Historico de Relatorios`.

### 2.4. Outras abas da tela
* **Dashboard Analítico:** lê as colunas B, C, G, I e J da aba de controle e mostra KPIs e gráficos por mês, operadora e tipo. O botão **Forçar Leitura da Planilha Novamente** recarrega os dados.
* **Consultar Relatórios:** lista os relatórios HTML salvos em `Historico de Relatorios`.

---

## ⚠️ Pontos de atenção conhecidos

Itens abaixo foram observados na leitura do código e **ainda não foram corrigidos**:

1. **Colunas do NF_Ticket e do NF_SOMA:** o código grava em colunas diferentes das indicadas nos cabeçalhos da planilha atual (por exemplo, ticket FAT em V/W em vez de W/X; CAP em AA/AB em vez de AC/AD; `NF_SOMA` lê A, B e C e grava em D). Confira o layout real antes de rodar em produção.
2. **Aba "Consultar Relatórios":** `Index.html` chama `listarRelatoriosSalvos`, que não existe em `Codigo.gs`.
3. **Gráfico "Custo por Tipo de Serviço":** `Index.html` usa `typesKeys`, variável inexistente (o nome certo é `tiposKeys`).
4. **Regex do histórico em `Index.html` (linhas 752 a 755):** a expressão do `.replace(/\s*...)` aparece quebrada em duas linhas e a regex seguinte tem menos grupos do que o código usa. Se isso estiver igual no editor do Apps Script, é erro de sintaxe e a tela inteira não funciona.
5. **Direção do faturamento no salvamento:** o Auditor usa a direção escolhida na tela para todos os arquivos do lote, mesmo que a prévia mostre direções diferentes por projeção.
6. **Nomes de arquivo iguais:** para SURF, TIM e OI, dois grupos do mesmo lote podem gerar o mesmo prefixo, e o segundo arquivo substitui o primeiro (o antigo vai para a lixeira).
7. **Sem autenticação no Web App de NF:** quem tiver a URL consegue inserir notas.

---

## 🧯 Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `Cannot call SpreadsheetApp.getUi() from this context` | função com `alert` rodando por gatilho | trocar o alerta por `Logger.log` ou rodar pelo menu |
| `Exceeded maximum execution time` | muitas linhas pendentes ou arquivos grandes | rodar de novo (continua das linhas ainda vazias) |
| `ERRO NO GOOGLE DRIVE!` | ID de pasta errado ou sem permissão | conferir os IDs e o acesso da conta |
| `Acesso Negado à Planilha de Controle` / `Erro ao acessar a planilha do Anexo 5` | ID errado ou sem permissão | conferir `ID_PLANILHA_CONTROLE` e `ID_PLANILHA_ANEXO5` |
| `Linha não encontrada na Planilha de Controle` | combinação mês + tipo + operadora + tipo da relacionada não existe na aba | criar a linha na planilha ou usar o botão manual depois de ajustá-la |
| Tela do Auditor parada em "Lendo matriz..." ou "Gerando CSVs..." | erro ou tempo esgotado no servidor (a tela não trata falhas) | recarregar a página e consultar **Execuções** no Apps Script |
| Mudança no código não aparece no Web App | implantação ainda na versão antiga | publicar uma nova versão da implantação |
