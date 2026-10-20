# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

---

## Módulos do Repositório

### 1. Painel de Chamados Administrativos | Gestão de Telefonia
Localizado no diretório [`painel-chamados-telefonia/`](./painel-chamados-telefonia/):
* Sistema de chamados desenvolvido em **Google Apps Script** e **Google Sheets**.
* Criação automatizada de pasta no Drive e planilha via `Setup.js`.
* Interface executiva alinhada com o design da **brisanet** (Figtree, Rubik, sem emojis).
* Veja as instruções de uso no [`README.md`](./painel-chamados-telefonia/README.md) do módulo.

### 2. Painel de Contratos | Gestão de Fornecedores
Localizado no diretório [`sistema-gestao-contratos/`](./sistema-gestao-contratos/):
* Sistema de controle, acompanhamento e cadastro de contratos em **Google Apps Script** e **Google Sheets**.
* Formulário completo de 32 colunas (A até AF) com cálculo automático de reajustes e moedas.
* Upload de documentos e anexos por arrastar e soltar (Drag & Drop) integrado ao **Google Drive** na pasta `Contratos - Anexos`.
* Dashboard interativo com busca em tempo real, filtros por status e risco, e modal de detalhes.
* Sem emojis, visual corporativo e profissional.
* Veja as instruções completas no [`README.md`](./sistema-gestao-contratos/README.md) do módulo.

### 3. Painel de Orçamento 2028 | OPEX e CAPEX
Localizado no diretório [`orcamento-2028/`](./orcamento-2028/):
* Sistema de planejamento e consolidação orçamentária para 2028 da Gerência Executiva de Telefonia.
* Arquitetura em 4 arquivos canônicos: `Codigo.gs`, `Index.html`, `CSS.html` e `JS.html`.
* Visão consolidada por pacote e visão detalhada por setores (Gestão Telefonia, Operação e Manutenção de Redes, Telefonia, Operações de Redes, Projetos de Implantação).
* Sincronização direta e bidirecional com Google Sheets (`OPEX_Dados`, `CAPEX_Dados`, `Importacao`).
* Suporte completo a atalhos, navegação por teclado e colar (copy/paste) diretamente de planilhas Excel.
* Veja as instruções completas no [`README.md`](./orcamento-2028/README.md) do módulo.

### 4. Automação de Abastecimento e Custos de Frotas
Localizado no diretório [`automacao-abastecimento-frotas/`](./automacao-abastecimento-frotas/):
* Módulo independente com automação em **Google Apps Script** para importação de extratos de abastecimento (Ticket Log / `RFCV_*.csv`) e manutenção de veículos.
* Direcionamento mensal para as planilhas da pasta `CUSTOS DO SETOR > OPERAÇÃO E MANUTENÇÃO DE REDES > 2026` (aba `Base_Abastecimento`).
* Padronização de dados, extração dinâmica de período/mês, conversão monetária e filtragem por colaboradores do setor.
* Menu executivo integrado no Google Sheets (`🚗 Gestão de Frota`) e agendamento de leitura diária automática.
* Veja o passo a passo completo no [**`GUIA_DE_ATIVACAO.md`**](./automacao-abastecimento-frotas/GUIA_DE_ATIVACAO.md).
