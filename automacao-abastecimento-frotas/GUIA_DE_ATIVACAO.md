# 💰 Guia de Ativação: Gestão de Custos (Frota, Viagens e Atividades)

Manual passo a passo para configurar a importação automática de **Frota Unificada (Combustível e Manutenção)**, **Viagens (Alimentação e Hospedagem)** e **Atividades (Chamados de Manutenção)** para as planilhas de custos mensais da gerência (**OPERAÇÃO E MANUTENÇÃO DE REDES**).

---

## 📌 Visão Geral do Fluxo

```
[1. Origens dos Dados]
   ├── Frota (Arquivo Único): Pasta 'Frota Telefonia - Combustível e Manutenção' (.xlsx ou .csv)
   │     └── Contém 39 colunas (A até AM), com Combustível e Manutenção juntos
   │           ├── Coluna C: 'BRISANET ABASTECIMENTO' ──► Base_Abastecimento
   │           └── Coluna C: 'BRISANET MANUTENCAO'    ──► Base_Manutenção
   ├── Viagens: Planilha 'CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026'
   │     └── Alimentação (A:C) e Hospedagem (F:H)     ──► Base_Viagens
   └── Atividades: Planilha 'CHAMADOS'
         └── Chamados de Manutenção (Col A até L)     ──► Atividades
               │
               ▼
[2. Execução pelo Menu Superior (onOpen)]
   - Menu: 💰 Gestão de Custos ──► ⚡ Importar Dados da Aba Atual
   - Ou opções diretas para Frota Unificada, Viagens, Atividades ou Todos
               │
               ▼
[3. Tratamento e Regras Estritas]
   ├── Filtro de Mês: Apenas lançamentos do mês da planilha ativa (ex.: OUTUBRO)
   ├── Filtro de Colaborador: Apenas quem está na Coluna A da aba 'Custos_Totais'
   ├── Base_Abastecimento: Linha 2 em diante limpa e relançada (Col K, Col S, Mês, Col D)
   ├── Base_Manutenção: Linha 2 em diante limpa e relançada (Col K, Col S, Col V, Mês, Col D)
   ├── Base_Viagens: Linha 3 em diante limpa e relançada em A:C e F:H (Coluna D mantida intacta)
   ├── Atividades: Linha 3 em diante atualizada com chamados de Manutenção (Expansões mantidas intactas e desconsiderando EQUIPE MNT. - INTERNA e Tecnologia 5.8)
   ├── Arquivo Processado: Movido automaticamente para 'Arquivos Processados' (sem duplicidade)
   └── Formatação Monetária e de SLA automáticas
```

---

## 📂 Pastas e Links Oficiais

1. **Pasta Raiz 2026 (Planilhas Mensais de Custos):**
   - Link: [Pasta 2026](https://drive.google.com/drive/folders/1P-QIZVEhADgyZk62snW9nDcV8E_4vLRU)
   - Exemplo: `10. CUSTOS DO SETOR - OUTUBRO - 2026`
2. **Pasta Unificada de Frota (Entrada de Arquivos):**
   - Nome: `Frota Telefonia - Combustível e Manutenção`
   - Subpasta de Histórico: `Arquivos Processados` (criada dentro da pasta principal)
   - *Observação:* Se você ainda não criou essa pasta no Drive, o próprio script cria automaticamente ao clicar em **`📁 Criar / Verificar Pastas no Google Drive`** no menu da planilha!
3. **Planilha de Origem de Viagens:**
   - Link: [CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026](https://docs.google.com/spreadsheets/d/1ETgxoOa4LyfZGTMYsTgMlEPyFHCDP43VH9dUNdTqYEk/edit?gid=1863439256)

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
   - Se estiver na aba `Base_Abastecimento` ou `Base_Manutenção`: importa o extrato unificado de frota do mês.
   - Se estiver na aba `Base_Viagens`: importa a alimentação e hospedagem do mês.
   - Se estiver na aba `Atividades`: importa os chamados de manutenção do mês da planilha CHAMADOS.
   - Se estiver em outra aba: pergunta se deseja importar todos os custos e atividades.
2. **`🚗 Frota: Importar Combustível e Manutenção (Arquivo Unificado)`**:
   - Lê o arquivo único na pasta do Drive, classifica as linhas automaticamente e preenche tanto `Base_Abastecimento` quanto `Base_Manutenção` de uma só vez!
3. **`⛽ Frota: Importar Apenas Abastecimento`**: Atualiza apenas a aba de abastecimento.
4. **`🔧 Frota: Importar Apenas Manutenção`**: Atualiza apenas a aba de manutenção.
5. **`✈️ Viagens: Importar Alimentação e Hospedagem (Desta Planilha)`**: Importa as viagens do mês direto para a aba `Base_Viagens`.
6. **`📋 Atividades: Importar Chamados de Manutenção (Desta Planilha)`**: Extrai os chamados de manutenção da planilha oficial `CHAMADOS` e preenche a aba `Atividades`, preservando as linhas de Expansão (Placas).
7. **`🔄 Importar TUDO (Frota + Viagens + Atividades - Desta Planilha)`**: Executa a importação unificada completa (Frota + Viagens + Chamados) para a planilha ativa.

### 🌐 Sincronização em Lote (Pasta 2026 - Julho em diante):
8. **`🌐 Sincronizar TODAS as Planilhas (Frota + Viagens + Atividades)`**: Sincroniza Frota, Viagens e Chamados em todas as planilhas da pasta 2026 de Julho em diante em um só comando.
9. **`🚗 Sincronizar Apenas Frota em TODAS (Julho em diante)`**: Sincroniza apenas os dados de frota unificada em todas as planilhas elegíveis.
10. **`✈️ Sincronizar Apenas Viagens em TODAS (Julho em diante)`**: Sincroniza apenas Viagens em todas as planilhas elegíveis.
11. **`📋 Sincronizar Apenas Chamados em TODAS (Julho em diante)`**: Sincroniza apenas Chamados (Aba Atividades) em todas as planilhas elegíveis.

### 🛠️ Pastas, Utilidades e Diagnóstico:
12. **`📁 Criar / Verificar Pastas no Google Drive`**: Cria automaticamente (ou localiza) a pasta principal `Frota Telefonia - Combustível e Manutenção` e a subpasta `Arquivos Processados`, exibindo os links na tela.
13. **`📁 Reprocessar da Pasta 'Arquivos Processados' (Frota)`**: Reprocessa extratos de frota já arquivados.
14. **`🧹 Limpar Dados da Aba Atual`**: Limpa os dados da aba atual de forma segura (na aba `Base_Viagens`, preserva a Coluna D e cabeçalhos; na aba `Atividades`, preserva linhas de Expansão).
15. **`🔍 Testar Conexões e Diagnóstico`**: Valida o acesso à pasta unificada de frota, à planilha de viagens, à planilha de chamados, à pasta 2026 e à lista de colaboradores.

---

## 🚗 Layout das 39 Colunas do Arquivo Unificado

O arquivo único de frota deve conter as colunas de A até AM:
* **Coluna C (`NOME REDUZIDO`):** Define o destino (`BRISANET ABASTECIMENTO` -> `Base_Abastecimento`; `BRISANET MANUTENCAO` -> `Base_Manutenção`).
* **Coluna D (`DATA TRANSACAO`):** Extrai a data e hora oficial da transação.
* **Coluna K (`NOME MOTORISTA`):** Nome do colaborador, validado contra a Coluna A de `Custos_Totais`.
* **Coluna S (`VALOR EMISSAO`):** Valor monetário em R$.
* **Coluna V (`TIPO ESTABELECIMENTO`):** Tipo/ramo do estabelecimento (para a `Base_Manutenção`).
