# 📘 Guia Passo a Passo: Como Usar e Executar a Automação 5G

Este guia detalha o passo a passo completo para configurar, autorizar e executar a automação de integrações de sites 5G, ingestão da API do Sytex (.xlsx), conciliação com chamados de integração e preenchimento automático dos diagramas de rede.

---

## 📌 Visão Geral do Fluxo

```
[1. Sytex API] ─────────────► Baixa relatório (.xlsx em memória)
                               │ (Higieniza sites: remove .1, .02)
                               ▼
[2. Planilha Integrações] ──► Filtra chamados finalizados no mês da aba
                               │ (Extrai Vendor e Integrador Brisanet/Fiberhome)
                               ▼
[3. Matriz Diagramas 5G] ───► Vincula Projeto, Mão de Obra e Serviço Terceiro
                               │
                               ▼
[4. Planilha de Destino] ───► Gera a Tabela Única de 10 Colunas (Linha 5+)
                              + Atualiza os Indicadores de Topo (Linhas 1 a 3)
```

---

## 🛠️ PARTE 1: Configuração Inicial (Feita Apenas na 1ª Vez)

> [!NOTE]
> **Zero Configuração de Serviços Avançados:** O script foi desenvolvido para funcionar diretamente, **sem necessidade de ativar nada em "+ Serviços"** no editor do Apps Script.

### 1.1. Abrir o Editor do Google Apps Script
1. Abra a planilha oficial de controle no Google Sheets:
   * [Planilha Oficial de Destino](https://docs.google.com/spreadsheets/d/1_QIjeOwBFqW5BzEEq4OCCIWKFG7O8-YONGIoH5R9za8/edit?gid=1515083791#gid=1515083791)
2. No menu superior da planilha, clique em **Extensões** > **Apps Script**.

---

### 1.2. Atualizar o Código
1. No editor de código, abra o arquivo `Código.gs` (ou crie um arquivo chamado `Codigo.gs`).
2. Apague todo o conteúdo anterior.
3. Copie todo o código atualizado do arquivo [`Codigo.js`](./Codigo.js) deste repositório e cole no editor.
4. Clique no ícone de disquete 💾 (**Salvar projeto**) ou aperte `Ctrl + S`.

---

### 1.3. Primeira Autorização de Segurança do Google
1. No topo do editor, selecione no menu suspenso de funções a opção `onOpen` e clique em **Executar**.
2. Uma janela pop-up chamada **"Autorização necessária"** será exibida. Clique em **Revisar permissões**.
3. Escolha a sua conta Google corporativa.
4. Se aparecer a tela *"O Google não verificou este app"*:
   * Clique no link pequeno **Avançado** (no canto inferior esquerdo).
   * Clique em **Acessar projeto (não seguro)**.
5. Clique em **Permitir**.
6. Quando o log de execução indicar *"Execução concluída"*, feche a aba do Apps Script.

---

## 🔑 PARTE 2: Configurar a Senha da API do Sytex

Para garantir a sua privacidade e segurança, a senha é armazenada diretamente na sua conta Google via planilha:

1. Volte para a aba da planilha no navegador e recarregue a página (**F5**).
2. Aguarde alguns segundos até que o menu **`🔄 Automação 5G`** apareça na barra de ferramentas superior.
3. Clique em **`🔄 Automação 5G`** > **`⚙️ Configurar Acesso Sytex (Senha)`**.
4. Uma caixa de diálogo será exibida. Digite a sua senha de acesso do Sytex associada ao usuário `riltomar@grupobrisanet.com.br`.
5. Clique em **OK**.
   > *A senha ficará salva de forma protegida nas propriedades da sua conta Google (PropertiesService), sem ficar exposta no código-fonte.*

---

## 🚀 PARTE 3: Como Executar no Dia a Dia (Rotina Mensal)

### Passo 1: Selecionar a Aba do Mês
Certifique-se de que a aba aberta na tela é a do mês que você deseja consolidar:
* Exemplo: clique na aba **`NOV/2026`** (ou `DEZ/2026`, `JAN/2027`, etc.).
* O script detecta automaticamente o mês e o ano pelo nome da aba ativa!

---

### Passo 2: Executar a Sincronização
1. Clique no menu superior **`🔄 Automação 5G`**.
2. Clique na primeira opção: **`🚀 Sincronizar Tudo (Sytex ➔ Integração ➔ Diagramas)`**.

---

### Passo 3: Acompanhar o Processamento
O script exibirá notificações temporárias (*toasts*) no canto inferior direito da tela informando o progresso:
* `Etapa 1/4: Baixando dados do Sytex via API...`
* `Etapa 2/4: Carregando chamados de Integração de Sites...`
* `Etapa 3/4: Mapeando base de diagramas 5G...`
* `Etapa 4/4: Conciliando dados e gerando tabela unificada...`

---

### Passo 4: Conferir o Resumo e a Tabela
Ao finalizar, um modal apresentará o relatório completo:
* Total de sites baixados do Sytex.
* Total de chamados conciliados para o mês.
* Quantidade atribuída a **BRISANET** e a **FIBERHOME**.
* Quantidade de diagramas vinculados com sucesso.

A tabela será gerada a partir da **Linha 5** com as 10 colunas oficiais:
1. **Data de Finalização**
2. **Frente / Categoria** (`Tecnologia`)
3. **Código do Site** (Higienizado, sem `.1` ou `.02`)
4. **Vendor** (ex.: `HUAWEI`, `FIBERHOME`)
5. **Integrador** (ex.: `BRISANET`, `FIBERHOME`)
6. **Chamado / Ticket**
7. **Projeto** (Código da Torre)
8. **Mão de Obra (Diagrama)** (ex.: `4055381 0020`)
9. **Serviço Terceiro (Diagrama)** (ex.: `4055381 0030`)
10. **Situação do Diagrama** (`OK`)

E as **Linhas 1 a 3** terão os cartões de indicadores automáticos atualizados com os totais!

---

## 🧰 PARTE 4: Demais Opções Disponíveis no Menu

* **`📡 1. Testar Ingestão Sytex API (.xlsx)`**:
  * Utilizado para testar se a conexão com o Sytex está ativa e funcionando.
  * Baixa o relatório em memória e mostra na tela o total de sites encontrados e os 10 primeiros códigos higienizados.
* **`📋 2. Conciliar Apenas Integração e Sytex`**:
  * Cruza os chamados de integração com o Sytex sem recalcular os diagramas.
* **`🗺️ 3. Atualizar Apenas Diagramas de Rede`**:
  * Se você alterar ou adicionar sites manualmente na coluna C, clique nesta opção para que o script preencha apenas as colunas de diagramas (G a J).

---

## ❓ Resolução de Dúvidas e Problemas Frequentes

### 1. O menu "🔄 Automação 5G" não apareceu na barra superior.
* **Solução:** Recarregue a página da planilha no navegador (**F5** ou `Ctrl + R`). O menu é recriado sempre que a planilha é aberta.

### 2. Preciso habilitar algum serviço em "+ Serviços"?
* **Não!** O script foi projetado para rodar com zero serviços externos, funcionando mesmo em contas corporativas onde o Google Cloud ou o menu de serviços esteja desabilitado.

### 3. Deu erro "Falha ao conectar na API Sytex (HTTP 401)".
* **Causa:** A senha do Sytex está incorreta ou desatualizada.
* **Solução:** Clique em **`🔄 Automação 5G`** > **`⚙️ Configurar Acesso Sytex (Senha)`** e informe a senha correta.

### 4. Por que alguns sites do Sytex não foram para a tabela final?
* **Regra de Negócio:** Para ir para a tabela final oficial, o site precisa:
  1. Estar ativo no relatório do Sytex.
  2. Constar na planilha `INTEGRAÇÃO DE SITES` com **Data de Finalização no mês da aba** (Coluna P).
  3. Ter o fornecedor/responsável preenchido na **Coluna L** (`REPORT`). Se a Coluna L estiver vazia, o chamado é desconsiderado e só será importado nos meses seguintes quando for preenchido na origem.

### 5. O que fazer quando virar o mês?
* **Simplicidade:** Você não precisa mexer no código! Basta criar a nova aba do mês (ex.: `DEZ/2026`) ou navegar até ela e rodar a opção **`🚀 Sincronizar Tudo`**. O script identificará o novo mês automaticamente.
