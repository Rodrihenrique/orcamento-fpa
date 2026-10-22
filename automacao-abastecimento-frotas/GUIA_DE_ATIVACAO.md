# 💰 Guia de Ativação: Gestão de Custos (Frota e Viagens)

Manual passo a passo para configurar a importação automática de **Combustível**, **Manutenção** e **Viagens (Alimentação e Hospedagem)** para as planilhas de custos mensais da gerência (**OPERAÇÃO E MANUTENÇÃO DE REDES**).

---

## 📌 Visão Geral do Fluxo

```
[1. Origens dos Dados]
   ├── Frota (Combustível): Pasta 'Combustível - Frotas Telefonia' (.xlsx ou .csv)
   ├── Frota (Manutenção): Pasta 'Manutenção - Frota Telefonia' (.xlsx ou .csv)
   └── Viagens: Planilha 'CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026'
         │
         ▼
[2. Execução pelo Menu Superior (onOpen)]
   - Menu: 💰 Gestão de Custos ──► ⚡ Importar Dados da Aba Atual
   - Ou opções diretas para Frota, Viagens ou Ambos
         │
         ▼
[3. Tratamento e Regras Estritas]
   ├── Filtro de Mês: Apenas lançamentos do mês da planilha ativa (ex.: OUTUBRO)
   ├── Filtro de Colaborador: Apenas quem está na Coluna A da aba 'Custos_Totais'
   ├── Base_Abastecimento & Base_Manutenção: Linha 2 em diante limpa e relançada
   ├── Base_Viagens: Linha 3 em diante limpa e relançada em A:C e F:H
   │   └── Coluna D ('nome corrigido') mantida intacta
   └── Formatação Monetária automática em R$ #,##0.00
```

---

## 📂 Links e IDs Oficiais

1. **Pasta 2026 (Planilhas Mensais de Custos):**
   - Link: [Pasta 2026](https://drive.google.com/drive/folders/1P-QIZVEhADgyZk62snW9nDcV8E_4vLRU)
   - Exemplo: `10. CUSTOS DO SETOR - OUTUBRO - 2026`
2. **Planilha de Origem de Viagens:**
   - Link: [CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026](https://docs.google.com/spreadsheets/d/1ETgxoOa4LyfZGTMYsTgMlEPyFHCDP43VH9dUNdTqYEk/edit?gid=1863439256)
3. **Pasta de Combustível (Frota):**
   - Link: [Combustível - Frotas Telefonia](https://drive.google.com/drive/folders/1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs)
4. **Pasta de Manutenção (Frota):**
   - Link: [Manutenção - Frota Telefonia](https://drive.google.com/drive/folders/1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2)

---

## 🛠️ Passo 1: Atualizar o Código no Apps Script da Planilha

1. Abra a planilha de custos (ex.: **`10. CUSTOS DO SETOR - OUTUBRO - 2026`**).
2. No menu superior do Google Sheets, clique em **Extensões** > **Apps Script**.
3. Selecione o arquivo **`Codigo.js`** (ou `Codigo.gs`).
4. Substitua o conteúdo pelo código completo do arquivo [`Codigo.js`](./Codigo.js) deste repositório.
5. Clique em **Salvar** (💾).

---

## ⚙️ Passo 2: Manifesto do Apps Script (`appsscript.json`)

Caso ainda não tenha configurado o manifesto no seu projeto:
1. No menu lateral esquerdo do Apps Script, clique em **Configurações do Projeto** (ícone de engrenagem ⚙️).
2. Marque a opção: **"Mostrar o arquivo de manifesto 'appsscript.json' no editor"**.
3. Volte ao **Editor** (< >) e selecione `appsscript.json`.
4. Garanta que o conteúdo seja exatamente o seguinte:
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

## 💰 Passo 3: Utilizando o Menu Superior (`onOpen`)

Ao abrir ou recarregar a planilha (`F5`), o menu **`💰 Gestão de Custos`** aparecerá no topo da planilha com as seguintes opções:

### 📌 Importações na Planilha Atual:
1. **`⚡ Importar Dados da Aba Atual`**:
   - Se estiver na aba `Base_Abastecimento`: importa o combustível do mês.
   - Se estiver na aba `Base_Manutenção`: importa a manutenção do mês.
   - Se estiver na aba `Base_Viagens`: importa a alimentação e hospedagem do mês.
   - Se estiver em outra aba: pergunta se deseja importar todos os custos.
2. **`⛽ Frota: Importar Abastecimento (Desta Planilha)`**: Importa apenas o extrato de combustível.
3. **`🔧 Frota: Importar Manutenção (Desta Planilha)`**: Importa apenas o extrato de manutenção.
4. **`✈️ Viagens: Importar Alimentação e Hospedagem (Desta Planilha)`**: Importa as viagens do mês direto para a aba `Base_Viagens`.
5. **`🔄 Importar TUDO (Frota + Viagens - Desta Planilha)`**: Executa as 3 importações em sequência para o mês atual.

### 🌐 Sincronização em Lote (Pasta 2026 - Julho em diante):
6. **`🌐 Sincronizar TODAS as Planilhas (Frota + Viagens)`**: Sincroniza Combustível, Manutenção e Viagens em todas as planilhas da pasta 2026 de Julho em diante em um só comando.
7. **`⛽ Sincronizar Apenas Frota em TODAS (Julho em diante)`**: Sincroniza apenas Abastecimento e Manutenção.
8. **`✈️ Sincronizar Apenas Viagens em TODAS (Julho em diante)`**: Sincroniza apenas Viagens em todas as planilhas elegíveis.

### 🛠️ Utilidades e Diagnóstico:
9. **`📁 Reprocessar da Pasta 'Arquivos Processados' (Frota)`**: Reprocessa extratos de frota já arquivados.
10. **`🧹 Limpar Dados da Aba Atual`**: Limpa os dados da aba atual de forma segura (na aba `Base_Viagens`, preserva a Coluna D e cabeçalhos).
11. **`🔍 Testar Conexões e Diagnóstico`**: Valida o acesso às pastas do Drive, à planilha de viagens e aos colaboradores de referência.

---

## 📋 Estrutura da Aba `Base_Viagens`

| Coluna | Campo | Regra / Tratamento |
|---|---|---|
| **A** | `COLABORADOR` | Nome do colaborador (validado em `Custos_Totais`) |
| **B** | `VALOR TOTAL` | Valor monetário de Alimentação formatado em R$ |
| **C** | `MÊS DO LANÇAMENTO - SAP` | Mês oficial da competência (ex.: `OUTUBRO`) |
| **D** | `nome corrigido` | **Preservada intacta / Nunca sobrescrita** |
| **E** | *(Espaço em branco)* | Coluna separadora mantida vazia |
| **F** | `COLABORADOR` | Nome do colaborador (validado em `Custos_Totais`) |
| **G** | `VALOR DIÁRIA` | Valor monetário de Hospedagem formatado em R$ |
| **H** | `MÊS DO LANÇAMENTO - SAP` | Mês oficial da competência (ex.: `OUTUBRO`) |

> **Nota:** As linhas 1 e 2 são os cabeçalhos de seção e colunas. Os dados são lançados **sempre a partir da linha 3**.
