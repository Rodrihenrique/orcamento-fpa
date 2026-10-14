# Painel de Orçamento 2028 | OPEX e CAPEX

Sistema executivo de planejamento e acompanhamento orçamentário desenvolvido em **Google Apps Script** e **HTML/Bootstrap 5** para a **Gerência Executiva de Telefonia da Brisanet**.

---

## 📌 Arquitetura dos Arquivos

O projeto está estruturado nos 4 arquivos canônicos do Google Apps Script:

1. **`Codigo.gs`**:
   - Backend Apps Script (Google Sheets API e RPC `google.script.run`).
   - Inicialização das abas necessárias (`OPEX_Dados`, `CAPEX_Dados`, `DETRAF`, `Premissas`, `Importacao`).
   - `doGet()` com injeção server-side dos dados salvos no template (`dadosIniciaisJSON`), eliminando telas brancas e garantindo carregamento instantâneo.
   - `salvarCustos(dados)` com persistência por ID único de sistema (`ID_Sistema`), data de modificação e valores mensais (Jan a Dez).
   - `obterCustosSalvos()` para leitura e recarregamento bidirecional da planilha.
   - `obterDadosImportacao(setor, tipo)` para sincronização da aba de importação em massa.

2. **`Index.html`**:
   - Estrutura visual da aplicação (Single Page Application).
   - Abas principais de navegação:
     - **Visão Consolidada**: Totalizadores anuais e mensais consolidados por pacote (OPEX e CAPEX).
     - **Lançamentos OPEX**: Visão setorizada detalhada das Despesas Operacionais.
     - **Lançamentos CAPEX**: Visão setorizada detalhada dos Investimentos de Capital.
   - Botões de ação executiva: **Recarregar Planilha** e **Salvar Orçamento Geral**.
   - Indicador visual de sincronização em tempo real (Sincronizado vs Pendente).
   - Componente de Toast para feedback ao usuário.

3. **`CSS.html`**:
   - Identidade visual oficial da **Brisanet** (Figtree, Rubik, Laranja `#FF5022`, Azul `#2242D4`).
   - Cards suaves, botões responsivos, tabelas limpas e formatação de células selecionadas para copiar/colar do Excel.

4. **`JS.html`**:
   - Regras de negócio, cálculo de totais, hierarquia de custos e sub-linhas.
   - Inicialização resiliente (`document.readyState` compatível com o iframe sandboxed do Apps Script).
   - Suporte completo a Copiar e Colar (Copy/Paste) a partir do Excel ou planilhas externas.
   - Exportação e importação de templates CSV e importação direta da aba `Importacao`.

---

## 🛠️ Correções Implementadas

### 1. Resolução do Sumiço de Dados nas Páginas OPEX e CAPEX
- **Causa Raiz 1 (Inicialização no Iframe)**: O evento `DOMContentLoaded` nem sempre disparava no ambiente encapsulado do Google Apps Script porque o iframe frequentemente já atingia o estado `interactive` ou `complete` no momento da execução do script, impedindo o renderizador de rodar e deixando as abas vazias. Corrigido com verificação dinâmica de `readyState`.
- **Causa Raiz 2 (Ausência de Leitura da Planilha)**: O sistema salvava os dados em `OPEX_Dados` e `CAPEX_Dados`, mas **nunca lia** esses dados na inicialização, dependendo exclusivamente de um `localStorage` instável/particionado no iframe do navegador. Implementada a função `obterCustosSalvos()` no backend e a injeção via `doGet()`.
- **Causa Raiz 3 (Suporte a CAPEX e Novos Setores)**: O CAPEX não possuía contas pré-definidas nem recebia os dados salvos da planilha, resultando em listas vazias. Agora tanto OPEX quanto CAPEX sincronizam de forma autônoma e bidirecional com a planilha Google.
- **Causa Raiz 4 (Preservação de Valores)**: Corrigido o zeramento indevido de linhas não validadas no cache local, garantindo que qualquer número digitado permaneça intacto.

---

## 🚀 Como Instalar e Publicar no Google Apps Script

1. Abra a sua Planilha Google oficial de Orçamento.
2. Acesse o menu superior: **Extensões** > **Apps Script**.
3. Crie os arquivos com os nomes exatos:
   - `Codigo.gs` (Arquivo de Script)
   - `Index.html` (Arquivo HTML)
   - `CSS.html` (Arquivo HTML)
   - `JS.html` (Arquivo HTML)
   - `appsscript.json` (Configurações do Projeto > Marcar "Mostrar arquivo de manifesto")
4. Cole o respectivo código de cada arquivo deste diretório.
5. Clique em **Implantar** > **Nova implantação**:
   - Tipo: **Aplicativo da Web**
   - Executar como: **Usuário que acessa o aplicativo da Web** ou **Eu**
   - Quem tem acesso: **Qualquer pessoa no grupo Brisanet** (ou conforme a política interna).
6. Acesse a URL gerada e utilize o painel com sincronização completa!
