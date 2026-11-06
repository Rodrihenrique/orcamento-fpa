# Sistema de Gestao de Contratos: Gerencia Executiva de Telefonia
**Grupo Brisanet**

---

## 1. Visao Geral

Plataforma corporativa em **Google Apps Script** e **Web App** para governanca, ciclo de vida e controle documental de contratos da **Gerencia Executiva de Telefonia** d'**a brisanet**.

O sistema estrutura a gestao de telecomunicacoes por fornecedor, automatiza o armazenamento em pastas dedicadas no Google Drive organizadas pelas 5 gerencias executivas da Telefonia (cada uma com pastas de fornecedores e contratos subdivididos em 5 subpastas oficiais), implementa esteira de aprovacoes em 3 niveis formais (Coordenador, Gerente e Gerente Executivo) e mantem uma trilha oficial de auditoria imutavel com emissao de Certificados de Conformidade.

---

## 2. Documentacao Oficial do Projeto

*   **[Manual do Usuario (Passo a Passo)](file:///C:/Users/Usuário/.gemini/antigravity/scratch/orcamento-fpa/sistema-gestao-contratos/MANUAL_DO_USUARIO.md):** Guia pratico e operacional para o setor administrativo (**Gestao Telefonia**) e para os **Aprovadores**.
*   **[Plano de Execucao Passo a Passo](file:///C:/Users/Usuário/.gemini/antigravity/scratch/orcamento-fpa/sistema-gestao-contratos/docs/PLANO_EXECUCAO_PASSO_A_PASSO.md):** Roteiro detalhado das fases e entregaveis tecnicos.
*   **[Desenho de Arquitetura Tecnica](file:///C:/Users/Usuário/.gemini/antigravity/scratch/orcamento-fpa/sistema-gestao-contratos/docs/DESENHO_ARQUITETURA.md):** Especificacao completa do modelo relacional, RBAC, maquina de estados e taxonomia no Drive.

---

## 3. Estrutura dos Arquivos de Codigo

*   **`Code.gs`**: Backend corporativo contendo:
    *   Provisionamento automatico da pasta raiz `Contratos - Gerência Executiva de Telefonia` e das 5 gerencias setoriais no Drive:
        *   `GESTAO TELEFONIA`
        *   `OPERACAO E MANUTENCAO DE REDES`
        *   `OPERACOES DE REDES`
        *   `PROJETOS DE IMPLANTACAO`
        *   `TELEFONIA`
    *   Gerenciamento das abas relacionais com 45 colunas estruturadas para contratos e suporte a fornecedores com Razao Social, Nome Fantasia e Apelido usual.
    *   Fluxo de cadastro centrado em Fornecedores com suporte a anexacao de contratos com 29 campos tecnicos, orcamentarios e de governanca.
    *   Esteira de alcadas com travas de concorrencia (`LockService`).
    *   Motor de auditoria imutavel em Horario de Brasilia (UTC-3).
    *   Geracao de certificados com assinatura digital (SHA-256).
*   **`Index.html`**: Interface moderna baseada no Design System oficial da **brisanet** (fontes `Figtree` e `Rubik`, paleta `#FF5022`, `#2242D4`, `#0B316D`, estritamente **zero emojis**):
    *   Aba **Novo Fornecedor** com Razao Social, Nome Fantasia e **Apelido** (nome mais conhecido pelos colaboradores).
    *   Modal de **Novo Contrato** com rolagem lateral e 29 campos estruturados em 6 secoes:
        1. Setor Responsavel, Identificacao & Objeto
        2. Vigencia, Prazos & Periodicidade
        3. Valores Financeiros, Moeda & Orcamento
        4. Regras de Reajuste & Base de Clientes
        5. Governanca, Risco & Memoria de Calculo
        6. Arquivos do Contrato (Upload no Drive)
    *   Mascaras em tempo real: CNPJ, Moeda (R$), Porcentagem (%), Data (DD/MM/AAAA) e Taxa de Cambio.
    *   Animacao de carregamento (Loading State) com overlay de bloqueio visual durante requisicoes.
    *   Ficha 360° do contrato e Central de Aprovacoes.
*   **`appsscript.json`**: Manifesto de configuracao com fuso horario `America/Fortaleza` e escopos de seguranca.

---

## 4. Modelo de Pastas no Google Drive

```
Contratos - Gerência Executiva de Telefonia/
│
├── 00_Configuracoes_e_Modelos/
│
├── GESTAO TELEFONIA/
├── OPERACAO E MANUTENCAO DE REDES/
├── OPERACOES DE REDES/
├── PROJETOS DE IMPLANTACAO/
└── TELEFONIA/
    │
    └── {NOME_FORNECEDOR}/
        └── CT-{ANO}-{ID} - {Objeto}/
            ├── 01_Contrato_Principal/
            ├── 02_Termos_Aditivos/
            ├── 03_Documentos_Tecnicos/
            ├── 04_Boletins_Medicao/
            └── 05_Aprovacoes_e_Pareceres/
```

---

## 5. Como Implantar no Google Apps Script

1.  Acesse o projeto do Apps Script vinculado a planilha corporativa.
2.  Copie o conteudo de `Code.gs` para o arquivo backend correspondente.
3.  Copie o conteudo de `Index.html` para o arquivo frontend correspondente.
4.  Clique em **Implantar** -> **Gerenciar Implantacoes** -> **Editar** e selecione a nova versao do Web App.
5.  Recarregue a planilha para ter acesso imediato ao menu superior **Gestao Telefonia**.
