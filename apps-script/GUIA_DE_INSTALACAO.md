# 🚀 Guia de Implantação do OrçaHub no Google Apps Script

Este guia explica, passo a passo, como colocar o **OrçaHub** para rodar dentro do **Google Workspace da Brisanet** em menos de 5 minutos, com banco de dados no Google Planilhas, robô de leitura diária do Gmail e painel web completo.

---

## 📁 Arquivos do Projeto Criados

Na pasta `apps-script/`, você encontrará os seguintes arquivos prontos:

| Arquivo | Tipo no Apps Script | Descrição |
| :--- | :--- | :--- |
| `appsscript.json` | Configuração (Manifesto) | Permissões de acesso ao Gmail, Drive e Sheets |
| `Code.gs` | Script (.gs) | Servidor do Web App e API de integração |
| `Database.gs` | Script (.gs) | Estrutura das abas e banco de dados na planilha |
| `EmailBot.gs` | Script (.gs) | Robô diário que monitora `telefonia.administrativo@grupobrisanet.com.br` |
| `Index.html` | HTML (.html) | Interface visual completa do OrçaHub com botões flutuantes |

---

## 🛠️ Passo a Passo de Instalação (5 Minutos)

### Passo 1: Criar a Planilha no Google Drive
1. Acesse o seu Google Drive da Brisanet (`drive.google.com`).
2. Clique em **+ Novo > Planilhas Google > Planilha em branco**.
3. Dê o nome da planilha de: **`OrçaHub - Base Orçamentária Telefonia`**.

---

### Passo 2: Abrir o Editor do Apps Script
1. Na planilha recém-criada, clique no menu superior em:  
   **Extensões** ➔ **Apps Script**.
2. Uma nova aba será aberta com o editor de código do Google.
3. No canto superior esquerdo, renomeie o projeto para: **`OrçaHub - Sistema Telefonia`**.

---

### Passo 3: Colar os Códigos no Editor

#### 1. Configurar o manifesto `appsscript.json`
- No menu lateral esquerdo do Apps Script, clique no ícone de engrenagem ⚙️ (**Configurações do Projeto**).
- Marque a caixa de seleção: **"Mostrar arquivo de manifesto 'appsscript.json' no editor"**.
- Volte ao editor de código (ícone `< >`).
- Clique no arquivo `appsscript.json` e substitua todo o conteúdo pelo arquivo `apps-script/appsscript.json`.

#### 2. Colar os Scripts (.gs)
- No arquivo `Código.gs` (ou renomeie para `Code.gs`), substitua o conteúdo pelo código de `apps-script/Code.gs`.
- Clique no botão **+** (ao lado de "Arquivos") ➔ selecione **Script** ➔ nomeie como **`Database`** ➔ cole o código de `apps-script/Database.gs`.
- Clique no botão **+** ➔ selecione **Script** ➔ nomeie como **`EmailBot`** ➔ cole o código de `apps-script/EmailBot.gs`.

#### 3. Criar o arquivo HTML
- Clique no botão **+** ➔ selecione **HTML** ➔ nomeie exatamente como **`Index`** (o Apps Script adiciona `.html` automaticamente).
- Substitua todo o conteúdo pelo arquivo `apps-script/Index.html`.
- Clique no ícone de disquete 💾 (**Salvar projeto**) ou aperte `Ctrl + S`.

---

### Passo 4: Criar as Abas da Planilha (1 Clique)
1. No topo do editor do Apps Script, localize o menu suspenso de funções (onde diz `doGet`).
2. Selecione a função: **`configurarPlanilhaInicial`**.
3. Clique em **Executar** (ícone de Play ▶️).
4. O Google exibirá uma janela solicitando autorização:
   - Clique em **Revisar permissões**.
   - Escolha sua conta corporativa da Brisanet.
   - Clique em **Avançado** ➔ **Acessar OrçaHub (não seguro)** ➔ **Permitir**.
5. Em instantes, volte à sua Planilha Google: todas as abas (`CONFIGURACOES`, `OPEX`, `CAPEX`, `DETRAF`, `TORRES_SITES`, `AUDITORIA`, `REMANEJAMENTOS`) foram criadas e formatadas automaticamente!

---

### Passo 5: Ativar o Robô Diário de E-mails
1. No editor, selecione no menu suspenso a função: **`instalarGatilhoDiario`**.
2. Clique em **Executar** ▶️.
3. Pronto! O robô agora rodará **todos os dias às 06:00 da manhã** de forma 100% autônoma, buscando os e-mails direcionados para `telefonia.administrativo@grupobrisanet.com.br`, salvando os anexos no Drive e preenchendo as planilhas.

> **Dica:** Você também pode rodar o robô a qualquer momento clicando no novo menu que apareceu na sua planilha: **🚀 OrçaHub Telefonia > 📧 Verificar E-mails Agora**.

---

### Passo 6: Publicar o Web App (Link para a Equipe)
1. No canto superior direito do editor do Apps Script, clique no botão azul: **Implantar ➔ Nova implantação**.
2. Clique no ícone de engrenagem ⚙️ ao lado de "Selecione o tipo" e escolha **App da Web**.
3. Preencha as opções:
   - **Descrição:** `OrçaHub Versão Oficial Telefonia`
   - **Executar como:** `Eu (seu e-mail da Brisanet)`
   - **Quem pode acessar:** `Qualquer pessoa no Grupo Brisanet` (ou `Somente você`)
4. Clique em **Implantar**.
5. Copie a **URL do App da Web** gerada (algo como `https://script.google.com/a/macros/grupobrisanet.com.br/s/.../exec`).

---

## 🎉 Pronto!
- Guarde essa URL nos seus favoritos ou compartilhe com a sua coordenação.
- Ao abrir o link, você verá o **OrçaHub** rodando com interface moderna, botões flutuantes, sincronização com o Gmail e gravação em tempo real na sua Planilha Google!
