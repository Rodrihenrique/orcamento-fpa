# 🚗 Guia de Ativação: Importação de Abastecimento e Manutenção

Manual passo a passo para configurar a importação automática de arquivos Excel (**`.xlsx`**) e **`.csv`** de **Combustível** e **Manutenção** para a planilha mensal de custos da frota (**OPERAÇÃO E MANUTENÇÃO DE REDES**).

---

## 📌 Como Funciona o Fluxo

```
[1. Upload do Arquivo (.xlsx ou .csv) no Drive]
   - Manutenção: Pasta 'Manutenção - Frota Telefonia'
   - Combustível: Pasta 'Combustível - Frotas Telefonia'
         │
         ▼
[2. Execução pelo Menu Superior (onOpen) ou Botão]
   - Menu: 🚗 Gestão de Frota ──► ⚡ Importar Dados da Aba Atual
   - Ou opções diretas de Abastecimento / Manutenção / Ambos
         │
         ▼
[3. Processamento Automático e Limpeza Estrita]
   ├── Lê arquivos .xlsx nativos e .csv
   ├── Filtra estritamente pelo mês da planilha ativa (ex.: OUTUBRO)
   ├── Valida motoristas com a lista da aba 'Custos_Totais' (Coluna A)
   ├── LIMPEZA E RELANÇAMENTO: Limpa dados anteriores da aba (linha 2 em diante)
   ├── Insere os novos dados a partir da linha 2 (sem duplicidades)
   └── Move o arquivo processado para a subpasta 'Arquivos Processados'
```

---

## 📂 Estrutura de Pastas e Links

1. **Pasta 2026 (Planilhas Mensais):**
   - Link: [Pasta 2026](https://drive.google.com/drive/folders/1P-QIZVEhADgyZk62snW9nDcV8E_4vLRU)
   - Contém: `10. CUSTOS DO SETOR - OUTUBRO - 2026`
2. **Pasta de Combustível (CSV):**
   - Link: [Combustível - Frotas Telefonia](https://drive.google.com/drive/folders/1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs)
3. **Pasta de Manutenção (CSV):**
   - Link: [Manutenção - Frota Telefonia](https://drive.google.com/drive/folders/1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2)

---

## 🛠️ Passo 1: Inserir o Código no Apps Script da Planilha

1. Abra a planilha **`10. CUSTOS DO SETOR - OUTUBRO - 2026`** no Google Sheets.
2. No menu superior, clique em **Extensões** > **Apps Script**.
3. Renomeie o arquivo de script para **`Codigo.js`** (ou mantenha `Codigo.gs`).
4. Apague qualquer código existente e cole o conteúdo completo do arquivo [`Codigo.js`](./Codigo.js) deste repositório.
5. Clique em **Salvar** (💾).

---

## ⚙️ Passo 2: Configurar o Manifesto (`appsscript.json`)

1. No menu lateral esquerdo do Apps Script, clique em **Configurações do Projeto** (ícone de engrenagem ⚙️).
2. Marque a opção: **"Mostrar o arquivo de manifesto 'appsscript.json' no editor"**.
3. Volte ao menu **Editor** (< >) e clique no arquivo `appsscript.json`.
4. Substitua o conteúdo pelo do [`appsscript.json`](./appsscript.json) deste repositório:
```json
{
  "timeZone": "America/Fortaleza",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "serviceId": "drive",
        "version": "v2"
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```
5. Clique em **Salvar** (💾).

---

## 🚗 Passo 3: Utilizando o Menu Superior (`onOpen`)

A função **`onOpen()`** é executada automaticamente assim que a planilha é aberta ou recarregada (`F5`). Ela cria um menu na barra superior do Google Sheets:

### Itens do Menu **`🚗 Gestão de Frota`**:

#### 📌 Para a Planilha Ativa (Mês Atual):
1. **`⚡ Importar Dados da Aba Atual`**:
   - Detecta automaticamente em qual aba você está.
   - Se você estiver na aba `Base_Abastecimento`, importa o combustível do mês.
   - Se você estiver na aba `Base_Manutenção`, importa a manutenção do mês.
2. **`⛽ Importar Abastecimento (Desta Planilha)`**: Importa especificamente o extrato de combustível para a planilha aberta.
3. **`🔧 Importar Manutenção (Desta Planilha)`**: Importa especificamente o extrato de manutenção para a planilha aberta.
4. **`🔄 Importar Tudo (Desta Planilha)`**: Roda ambas as importações para a planilha aberta.

#### 🌐 Sincronização em Lote da Pasta 2026 (Julho em diante):
5. **`🌐 Sincronizar Todas as Planilhas (Julho em diante)`**:
   - Varre toda a pasta `2026` e identifica as planilhas de **JULHO a OUTUBRO (e próximos meses)**.
   - Extrai e distribui os lançamentos de cada mês diretamente na sua respectiva planilha.
   - Cada planilha é validada pela sua própria lista de colaboradores em `Custos_Totais`.
   - **Planilhas de Janeiro a Junho são mantidas intactas** (formato antigo preservado).
6. **`⛽ Sincronizar Abastecimento (Todas de Julho em diante)`**: Distribui combustível para todas as planilhas da pasta 2026.
7. **`🔧 Sincronizar Manutenção (Todas de Julho em diante)`**: Distribui manutenção para todas as planilhas da pasta 2026.

#### 🛠️ Utilitários:
8. **`📁 Reprocessar da Pasta 'Arquivos Processados'`**: Permite reler o histórico já processado.
9. **`🧹 Limpar Dados da Aba Atual`**: Limpa manualmente os lançamentos da aba atual (da linha 2 em diante).
10. **`🔍 Testar Conexões e Diagnóstico`**: Lista conexões e exibe todas as planilhas elegíveis encontradas na pasta 2026.

> **Dica:** Para fazer o menu aparecer pela primeira vez após colar o código, basta recarregar a planilha no navegador (`F5`) ou executar a função `onOpen` uma vez no editor do Apps Script.

---

## 🔘 Passo Opcional: Criar Botões Desenhados na Planilha

Se preferir ter um botão físico desenhado dentro da própria planilha:

### Botão 1: Na Aba `Base_Abastecimento`
1. Vá em: **Inserir** > **Desenho**, crie uma forma com o texto **`⛽ Importar Abastecimento`** e salve.
2. Clique nos 3 pontinhos do botão > **Atribuir script**.
3. Digite: `importarDadosAbastecimento` e confirme.

### Botão 2: Na Aba `Base_Manutenção`
1. Vá em: **Inserir** > **Desenho**, crie uma forma com o texto **`🔧 Importar Manutenção`** e salve.
2. Clique nos 3 pontinhos do botão > **Atribuir script**.
3. Digite: `importarDadosManutencao` e confirme.

---

## 🔐 Passo 4: Autorização Inicial de Permissões

Na primeira vez em que você clicar no menu ou botão:

1. Uma janela surgirá: **"Autorização necessária"** > Clique em **Continuar** / **Revisar permissões**.
2. Escolha sua conta corporativa Google.
3. Se aparecer a tela *"O Google não verificou este app"*:
   - Clique no link **Avançado** (canto inferior esquerdo).
   - Clique em **Acessar [Nome do Projeto] (não seguro)**.
4. Clique em **Permitir**.

---

## 📊 Estrutura de Colunas Preenchidas

### 1. Aba `Base_Abastecimento` (4 colunas)
| Coluna | Título | Origem / Formato |
| :---: | :--- | :--- |
| **A** | `NOME MOTORISTA` | Nome do colaborador no CSV (filtrado por `Custos_Totais`) |
| **B** | `VALOR EMISSAO` | Valor numérico formatado (moeda/decimal) |
| **C** | `PERÍODO` | Competência (ex.: `OUTUBRO`) |
| **D** | `DATA TRANSACAO` | Data e hora da transação (ex.: `01/08/2026 07:02:13`) |

### 2. Aba `Base_Manutenção` (5 colunas)
| Coluna | Título | Origem / Formato |
| :---: | :--- | :--- |
| **A** | `NOME MOTORISTA` | Nome do colaborador no CSV (filtrado por `Custos_Totais`) |
| **B** | `VALOR EMISSAO` | Valor numérico formatado (moeda/decimal) |
| **C** | `TIPO ESTABELECIMENTO` | Tipo de serviço / estabelecimento (ex.: `OFICINA MECANICA`, `LAVAGEM`) |
| **D** | `Período` | Competência (ex.: `OUTUBRO`) |
| **E** | `DATA TRANSACAO` | Data e hora da transação (ex.: `01/08/2026 05:19:32`) |
