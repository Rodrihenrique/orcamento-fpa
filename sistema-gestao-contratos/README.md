# Sistema de Gestão de Contratos: Gerência Executiva de Telefonia
**Grupo Brisanet**

---

## 1. Visão Geral

Plataforma corporativa em **Google Apps Script** e **Web App** para governança, ciclo de vida e controle documental de contratos da **Gerência Executiva de Telefonia** d'**a brisanet**.

O sistema estrutura a gestão de telecomunicações por fornecedor, automatiza o armazenamento em pastas dedicadas no Google Drive com 5 subpastas padronizadas, implementa esteira de aprovações em 3 níveis formais (Coordenador, Gerente e Gerente Executivo) e mantém uma trilha oficial de auditoria imutável com emissão de Certificados de Conformidade.

---

## 2. Documentação Oficial do Projeto

*   **[Manual do Usuário (Passo a Passo)](file:///C:/Users/Usuário/.gemini/antigravity/scratch/orcamento-fpa/sistema-gestao-contratos/MANUAL_DO_USUARIO.md):** Guia prático de utilização para o setor administrativo (**Gestão Telefonia**) e para os **Aprovadores**.
*   **[Plano de Execução Passo a Passo](file:///C:/Users/Usuário/.gemini/antigravity/scratch/orcamento-fpa/sistema-gestao-contratos/docs/PLANO_EXECUCAO_PASSO_A_PASSO.md):** Roteiro detalhado das fases e entregáveis técnicos.
*   **[Desenho de Arquitetura Técnica](file:///C:/Users/Usuário/.gemini/antigravity/scratch/orcamento-fpa/sistema-gestao-contratos/docs/DESENHO_ARQUITETURA.md):** Especificação completa do modelo relacional, RBAC, máquina de estados e taxonomia no Drive.

---

## 3. Estrutura dos Arquivos de Código

*   **`Code.gs`**: Backend corporativo contendo:
    *   Motor de provisionamento da pasta raiz `Contratos - Gerência Executiva de Telefonia` e subpastas no Drive.
    *   Gerenciamento das 6 abas relacionais (`Contratos`, `Fornecedores`, `Aprovacoes_Workflow`, `Aditivos`, `Acessos_Alcadas`, `Auditoria_Logs`).
    *   Esteira de alçadas com travas de concorrência (`LockService`).
    *   Motor de auditoria imutável em Horário de Brasília (UTC-3).
    *   Geração de certificados com assinatura digital (SHA-256).
*   **`Index.html`**: Interface moderna baseada no Design System oficial da **brisanet** (fontes `Figtree` e `Rubik`, paleta `#FF5022`, `#2242D4`, `#0B316D`, estritamente **zero emojis**), navegação centrada no fornecedor em cartões acordeão, Ficha 360° do contrato e Central de Aprovações.
*   **`appsscript.json`**: Manifesto de configuração com fuso horário `America/Fortaleza` e escopos de segurança.

---

## 4. Modelo de Pastas no Google Drive

```
Contratos - Gerência Executiva de Telefonia/
│
├── 00_Configuracoes_e_Modelos/
│
├── {NOME_FORNECEDOR}/
│   └── CT-{ANO}-{ID} - {Objeto}/
│       ├── 01_Contrato_Principal/
│       ├── 02_Termos_Aditivos/
│       ├── 03_Documentos_Tecnicos/
│       ├── 04_Boletins_Medicao/
│       └── 05_Aprovacoes_e_Pareceres/
```

---

## 5. Como Implantar no Google Apps Script

1.  Acesse o projeto do Apps Script vinculado à planilha corporativa.
2.  Copie o conteúdo de `Code.gs` para o arquivo backend correspondente.
3.  Copie o conteúdo de `Index.html` para o arquivo frontend correspondente.
4.  Clique em **Implantar** &rarr; **Gerenciar Implantações** &rarr; **Editar** e selecione a nova versão do Web App.
5.  Recarregue a planilha para ter acesso imediato ao menu superior **Gestão Telefonia**.
