# Guia Passo a Passo: Como Publicar o OrçaHub no Google Apps Script

Este guia ensina como colocar o **OrçaHub** no ar dentro do seu próprio Google Drive em menos de 5 minutos, utilizando uma planilha do Google Sheets como banco de dados e o Google Apps Script como servidor web gratuito.

---

### Passo 1: Criar a Planilha no Google Drive
1. Acesse o seu Google Drive e clique em **Novo (+)** > **Planilhas Google** (em branco).
2. Dê um nome para a planilha, por exemplo: `Orçamento Oficial 2026 - OrçaHub`.

---

### Passo 2: Abrir o Editor do Apps Script
1. Na planilha que você acabou de criar, clique no menu superior em **Extensões** > **Apps Script**.
2. Uma nova aba será aberta com o editor de código do Google.

---

### Passo 3: Colar o Código do Backend (`Code.gs`)
1. No editor, você verá um arquivo chamado `Código.gs` (ou `Code.gs`).
2. Apague qualquer código que estiver lá dentro.
3. Abra o arquivo [Code.js](file:///C:/Users/Usuário/orcamento-app/apps-script/Code.js) no seu computador, copie todo o conteúdo e cole dentro do `Code.gs`.
4. Clique no ícone de salvar (💾 ou `Ctrl + S`).

---

### Passo 4: Criar o Arquivo do Frontend (`Index.html`)
1. No canto esquerdo do editor do Apps Script, ao lado de **Arquivos**, clique no botão **+** (Mais) e selecione **HTML**.
2. Digite exatamente o nome: `Index` (o Google criará `Index.html`).
3. Apague qualquer código padrão que estiver lá.
4. Abra o arquivo [Index.html](file:///C:/Users/Usuário/orcamento-app/apps-script/Index.html) no seu computador, copie todo o conteúdo e cole dentro desse arquivo no Google Apps Script.
5. Clique no ícone de salvar (💾 ou `Ctrl + S`).

---

### Passo 5: Criar as Abas Automaticamente (Setup)
*Você não precisa criar as 6 abas e colunas manualmente na planilha! O script faz isso por você:*
1. No editor do Apps Script, na barra superior onde diz `doGet`, clique no menu suspenso de funções e selecione a função:
   👉 **`setupSpreadsheet`**
2. Clique no botão **Executar** (ícone de play ▶️).
3. O Google pedirá autorização na primeira vez:
   * Clique em **Revisar permissões**;
   * Escolha a sua conta Google;
   * Se aparecer a tela *"O Google não verificou este app"*, clique em **Avançado** (canto inferior esquerdo) e depois em **Acessar [Nome do projeto] (não seguro)**;
   * Clique em **Permitir**.
4. O script executará e criará automaticamente na sua planilha as abas: `Premissas`, `CentrosDeCusto`, `Contas`, `OPEX`, `CAPEX` e `Justificativas`, já com cabeçalhos e dados de exemplo!

---

### Passo 6: Publicar o Sistema (Implantar como Web App)
1. No canto superior direito do Apps Script, clique no botão azul **Implantar** > **Nova implantação**.
2. Na engrenagem ao lado de "Selecione o tipo", escolha: **App da web**.
3. Preencha as configurações:
   * **Descrição:** `OrçaHub v1.0`
   * **Executar como:** `Eu (seu-email@gmail.com)`
   * **Quem pode acessar:** 
     * Se for para toda a empresa: `Qualquer pessoa com uma Conta do Google` ou `Qualquer pessoa` (para facilitar o acesso dos gestores).
4. Clique no botão **Implantar**.
5. O Google gerará a **URL do app da web** (algo como `https://script.google.com/macros/s/.../exec`).

**Pronto!** Essa URL é o link definitivo do sistema. Qualquer pessoa que abrir essa URL verá o OrçaHub rodando com os dados lidos e salvos diretamente na sua planilha do Google Drive!
