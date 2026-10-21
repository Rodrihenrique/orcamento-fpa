# 🚗 Guia de Ativação: Importação de Abastecimento e Manutenção

Manual passo a passo para configurar a importação automática de arquivos CSV de **Combustível** e **Manutenção** para a planilha mensal de custos da frota (**OPERAÇÃO E MANUTENÇÃO DE REDES**).

---

## 📌 Como Funciona o Fluxo

```
[1. Upload do CSV]
   - Manutenção: Pasta 'Manutenção - Frota Telefonia'
   - Combustível: Pasta 'Combustível - Frotas Telefonia'
         │
         ▼
[2. Clique no Botão na Planilha]
   - Na aba 'Base_Abastecimento' ──► Executa: importarDadosAbastecimento
   - Na aba 'Base_Manutenção'    ──► Executa: importarDadosManutencao
         │
         ▼
[3. Processamento Automático]
   ├── Detecta delimitador do CSV (, ou ;)
   ├── Valida motoristas com a lista da aba 'Custos_Totais' (Coluna A)
   ├── Extrai período (ex.: OUTUBRO) e formata valores monetários
   ├── Insere os dados nas colunas solicitadas da aba correspondente
   └── Move o CSV processado para a subpasta 'Arquivos Processados'
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
3. Renomeie o arquivo de script para **`Codigo.js`** (ou use `Codigo.gs`).
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
    "enabledAdvancedServices": []
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
  ]
}
```
5. Clique em **Salvar** (💾).

---

## 🔘 Passo 3: Criar os Botões nas Abas da Planilha

Para acionar a importação com apenas um clique:

### Botão 1: Na Aba `Base_Abastecimento`
1. Acesse a aba **`Base_Abastecimento`**.
2. No menu superior da planilha, vá em: **Inserir** > **Desenho**.
3. Desenhe um retângulo ou botão arredondado.
4. Escreva dentro dele: **`⛽ Importar Abastecimento`** e formate as cores (ex.: fundo azul ou verde com texto em negrito).
5. Clique em **Salvar e fechar**.
6. Posicione o botão no topo da planilha (ao lado das colunas E ou F).
7. Clique nos **3 pontinhos verticais** no canto superior direito do botão criado.
8. Selecione **Atribuir script**.
9. Digite exatamente:
   ```
   importarDadosAbastecimento
   ```
10. Clique em **OK**.

---

### Botão 2: Na Aba `Base_Manutenção`
1. Acesse a aba **`Base_Manutenção`**.
2. Vá em: **Inserir** > **Desenho**.
3. Crie um botão com o texto: **`🔧 Importar Manutenção`**.
4. Clique em **Salvar e fechar** e posicione-o no topo da aba.
5. Clique nos **3 pontinhos** do botão > **Atribuir script**.
6. Digite exatamente:
   ```
   importarDadosManutencao
   ```
7. Clique em **OK**.

---

## 🔐 Passo 4: Autorização Inicial de Permissões

Na primeira vez em que você clicar no botão (ou testar a função):

1. Uma janela surgirá: **"Autorização necessária"** > Clique em **Continuar** / **Revisar permissões**.
2. Escolha sua conta corporativa Google.
3. Se aparecer a tela *"O Google não verificou este app"*:
   - Clique no link **Avançado** (canto inferior esquerdo).
   - Clique em **Acessar [Nome do Projeto] (não seguro)**.
4. Clique em **Permitir**.

---

## 🧪 Passo 5: Testar as Conexões

Você pode testar se a planilha localiza as pastas e os colaboradores:
1. No menu superior do Google Sheets, clique em: **`🚗 Gestão de Frota`** > **`🔍 Testar Conexões e Abas`**.
2. A planilha exibirá um relatório confirmando:
   - ✅ Planilha ativa identificada
   - ✅ Quantidade de colaboradores lidos na Coluna A da aba `Custos_Totais`
   - ✅ Pastas de Combustível e Manutenção conectadas com sucesso

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
