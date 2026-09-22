# 🚀 Guia de Instalação: Automação Gmail ➔ Google Drive (DETRAF & Boletos)

Este guia orienta como ativar a automação no Google Workspace (`telefonia.administrativo@grupobrisanet.com.br`) apontando para a sua pasta do Google Drive:
* **ID da Pasta Raiz:** `16qP-IlIk0MpMeVCpfzuMb9fa4cI4MoTS`

---

## ⏱️ Passo a Passo (Tempo estimado: 3 minutos)

### Passo 1: Abrir o Google Apps Script
1. No seu navegador, com a conta `telefonia.administrativo@grupobrisanet.com.br` conectada, acesse:
   👉 **[script.google.com/home/start](https://script.google.com/home/start)**
2. Clique no botão **"Novo projeto"** (ou *New project*).
3. No topo esquerdo, renomeie o projeto de *"Projeto sem título"* para:
   **`OrçaHub - Automação Gmail e Drive`**

---

### Passo 2: Colar o Código da Automação
1. Apague qualquer código que estiver no editor (`function myFunction() { ... }`).
2. Abra o arquivo [`Automacao_Gmail_Drive_DETRAF.js`](Automacao_Gmail_Drive_DETRAF.js), copie todo o seu conteúdo e cole no editor do Apps Script.
3. Pressione `Ctrl + S` para salvar o projeto.

---

### Passo 3: Executar a Configuração Inicial
1. Na barra superior do Apps Script, selecione a função **`setupEnvironment`** no menu suspenso.
2. Clique no botão **Executar** (ícone de play ▶️).
3. **Autorização de Permissões:**
   * O Google solicitará permissão para acessar o Gmail (ler anexos e criar etiquetas) e o Google Drive (criar pastas e planilhas).
   * Clique em **"Revisar permissões"** ➔ Selecione a sua conta ➔ Clique em **"Avançado"** ➔ **"Acessar OrçaHub - Automação Gmail e Drive (não seguro)"** ➔ **"Permitir"**.
4. Aguarde a mensagem no registro de execução:
   `✅ Estrutura criada com sucesso no Google Drive!`

*(Se você abrir a pasta no seu Google Drive agora, verá que as pastas `01_Entrada`, `02_Processados`, `03_Divergencias_e_Glosas`, `04_Bases_Consolidadas` e a planilha de controle já foram criadas automaticamente!)*

---

### Passo 4: Testar o Processamento de E-mails
1. No menu suspenso, selecione a função **`processarEmailsRecebidos`**.
2. Clique em **Executar** (▶️).
3. O script buscará os e-mails com boletos e DETRAF, baixará os anexos, descompactará os ZIPs e registrará tudo na planilha de controle.

---

### Passo 5: Ativar a Execução Automática Contínua
Para que o script rode sozinho sem que você precise abrir o computador:
1. No menu suspenso, selecione a função **`configurarGatilhoAutomatico`**.
2. Clique em **Executar** (▶️).
3. Pronto! A partir de agora, a cada **30 minutos**, o script varre os novos e-mails recebidos e envia para o Google Drive automaticamente.

---

## 📂 O Que Acontece Automaticamente

1. **Boletos e NFs:** Vão direto para `01_Entrada/Boletos_e_NFs/`.
2. **DETRAF (Claro, Vivo, TIM, Algar, ABR Telecom):** Vão para `01_Entrada/DETRAF_Interconexao/`.
3. **Arquivos ZIP:** O script descompacta o `.zip` na hora, criando uma pasta com a data e extraindo os relatórios e CDRs automaticamente.
4. **Planilha de Controle:** A planilha `Base_Controle_Documentos_Recebidos` (dentro de `04_Bases_Consolidadas`) registra a data, remetente, categoria, nome do arquivo e link direto de acesso no Drive.
5. **Etiqueta no Gmail:** Cada e-mail tratado recebe a etiqueta `OrçaHub/Processado`, garantindo que **nenhum boleto seja baixado duas vezes**.
