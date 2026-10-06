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
