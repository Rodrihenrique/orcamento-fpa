# Painel de Chamados Administrativos | Gestão de Telefonia
### GERÊNCIA EXECUTIVA DE TELEFONIA | BRISANET

Sistema corporativo de gestão de demandas e abertura de chamados desenvolvido em **Google Apps Script** com persistência em **Google Sheets** e armazenamento de arquivos no **Google Drive**.

---

## 1. Características do Projeto

* **Padrão Visual Executivo (brisanet):**
  * Tipografia oficial: **Figtree** (títulos e textos) e **Rubik** (números e KPIs).
  * Paleta de cores corporativa: Laranja Brisa (`#FF5022`), Azul Brisa (`#2242D4`), Cinza Claro (`#E8E8E8`) e Azul Marinho (`#0B316D`).
  * **Zero emojis**: Adoção integral de ícones vetoriais lineares SVG.
  * Estrutura inspirada no painel de indicadores da brisanet (header com filtros, navegação por abas em pílulas, cards de métricas herói).
* **Privacidade do Solicitante:**
  * Cada colaborador visualiza apenas as solicitações criadas pelo seu próprio e-mail corporativo.
* **Upload Multi-formato no Google Drive:**
  * Suporte a documentos, planilhas, PDFs, imagens e arquivos compactados (ZIP, RAR) armazenados em pastas individuais por chamado (`Chamados_Gestao_Telefonia/{ANO}/{ID_CHAMADO}`).
* **Painel Administrativo da Telefonia:**
  * Fila geral de chamados com busca e filtros rápidos.
  * Gaveta lateral para assumir demandas, registrar pareceres/feedbacks e mudar status.
  * Histórico de auditoria imutável (audit trail).
  * Notificações automáticas por e-mail em HTML padronizado.
* **Setup Automático com 1 Clique:**
  * O script `Setup.js` cria e formata a pasta do Drive, a Planilha Base e grava os IDs no `ScriptProperties`.

---

## 2. Estrutura de Arquivos

```text
painel-chamados-telefonia/
├── ESPECIFICACAO_PROJETO.md  # Documento técnico completo com arquitetura e regras
├── Setup.js                 # Script de inicialização automática (cria Drive + Sheets + Seed)
├── Code.js                  # Backend do Apps Script (RPCs, CRUD, Drive e E-mails)
├── Index.html               # Single Page Application completa (Tailwind, Figtree, Rubik, SVG)
├── appsscript.json          # Manifesto de configuração do Apps Script (V8, Timezone Fortaleza)
└── README.md                # Este guia de instalação e uso
```

---

## 3. Passo a Passo para Implantação

### Passo 1: Criar o Projeto no Google Apps Script
1. Acesse [script.google.com](https://script.google.com) e clique em **Novo projeto**.
2. Renomeie o projeto para: `Painel de Chamados Administrativos | Gestão de Telefonia`.

### Passo 2: Copiar os Arquivos
1. No editor do Apps Script, crie os seguintes arquivos e cole seus respectivos códigos deste repositório:
   * **`Setup.gs`**: copie o conteúdo de `Setup.js`.
   * **`Code.gs`**: copie o conteúdo de `Code.js`.
   * **`Index.html`**: crie um arquivo HTML chamado `Index` e cole o conteúdo de `Index.html`.
   * **`appsscript.json`**: clique em *Configurações do Projeto* > marque *Mostrar arquivo "appsscript.json" no editor* e cole o conteúdo.

### Passo 3: Executar o Setup Automático
1. No menu superior do editor, selecione a função **`setupSistema`** e clique em **Executar** (`Run`).
2. Conceda as permissões de acesso da sua conta Google Workspace.
3. No console de execução, confirme a criação da pasta `Chamados_Gestao_Telefonia` e da planilha `Base_Dados_Chamados_Telefonia_Brisanet`.
4. Os IDs serão salvos automaticamente nas propriedades do script.

### Passo 4: Fazer o Deploy do Web App
1. Clique no botão azul **Implantar** (*Deploy*) > **Nova implantação** (*New deployment*).
2. Selecione o tipo **Aplicativo da Web** (*Web app*).
3. Preencha as configurações:
   * **Descrição:** `Versão 1.0 - Painel Gestão de Telefonia`
   * **Executar como:** `Eu (seu.email@brisanet.com.br)`
   * **Quem tem acesso:** `Qualquer pessoa dentro do domínio brisanet` (ou `Qualquer pessoa`).
4. Clique em **Implantar** e copie a **URL do Aplicativo da Web**.

---

## 4. Gerenciamento das Categorias Dinâmicas

Para adicionar, editar ou remover tipos de chamado ou gerências:
1. Abra a planilha `Base_Dados_Chamados_Telefonia_Brisanet` no seu Google Drive.
2. Acesse a aba **`CONFIGURACOES`**.
3. Adicione novos nomes nas colunas correspondentes (`GERENCIAS_CADASTRADAS`, `CATEGORIAS_TELEFONIA` ou `ADMINISTRADORES_AUTORIZADOS`).
4. As opções atualizarão automaticamente no formulário web sem necessidade de alterar o código.
