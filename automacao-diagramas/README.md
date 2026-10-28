# Automação de Diagramas e Integrações 5G

Módulo em **Google Apps Script** para ingestão automatizada de relatórios da **API do Sytex (.xlsx)**, conciliação em memória com a base oficial de **Integração de Sites** e vinculação automática com a matriz hierárquica de **Diagramas 5G** (Mão de Obra e Serviço Terceiro).

---

## 🎯 Visão Geral do Ciclo Automatizado

1. **Ingestão Sytex (.xlsx em Memória):**
   * Conecta ao endpoint de exportação de DataReport (`https://app.sytex.io/api/datareport/.../export/?org_id=181`).
   * Converte temporariamente o `.xlsx` via Drive API v2, extrai os sites higienizados e descarta o arquivo temporário imediatamente.
   * Remove ponto e números subsequentes de cada código (ex.: `BCE0007.1` $\rightarrow$ `BCE0007`).

2. **Conciliação com a Planilha de Integrações (`INTEGRAÇÃO DE SITES`):**
   * Cruza a lista de sites ativos do Sytex com os chamados finalizados no mês da aba ativa (`NOV/2026`, etc.).
   * Extrai o **Vendor** (Coluna F) e o **Integrador / REPORT** (Coluna L).
   * Descarta registros com Coluna L vazia.

3. **Enriquecimento com a Base de Diagramas (`Diagramas - 5G`):**
   * Localiza o bloco da Torre para extrair o código do **Projeto** (ex.: `WL_AL-MCO0064-AL-MCO400-BRIT`).
   * Extrai o diagrama de **Mão de Obra** (linha `Mão de obra Tecnologia - ...` $\rightarrow$ ex.: `4055381 0020`).
   * Extrai o diagrama de **Serviço Terceiro** (linha `Serv. Terc. Tecnologia - ...` $\rightarrow$ ex.: `4055381 0030`).

4. **Tabela Única Consolidada (10 Colunas) & Indicadores:**
   * Grava a lista final desduplicada e formatada na aba ativa do mês a partir da linha 5.
   * Atualiza os cartões de indicadores automáticos no topo (linhas 1 a 3).

---

## 📋 As 10 Colunas Oficiais da Tabela

| Coluna | Nome do Campo | Origem | Exemplo |
| :---: | :--- | :--- | :--- |
| **A** | **Data de Finalização** | Planilha Integração (Col P) | `12/01/2026` |
| **B** | **Frente / Categoria** | Base Diagramas (Categoria) | `Tecnologia` |
| **C** | **Código do Site** | Sytex API (Higienizado sem `.1`) | `MCO0064` |
| **D** | **Vendor** | Planilha Integração (Col F) | `HUAWEI` |
| **E** | **Integrador** | Planilha Integração (Col L `REPORT`) | `BRISANET` |
| **F** | **Chamado / Ticket** | Planilha Integração | `TK-MCO0064-2026` |
| **G** | **Projeto** | Base Diagramas (Linha Torre) | `WL_AL-MCO0064-AL-MCO400-BRIT` |
| **H** | **Mão de Obra (Diagrama)** | Base Diagramas (Linha Mão de Obra) | `4055381 0020` |
| **I** | **Serviço Terceiro (Diagrama)** | Base Diagramas (Linha Serv. Terc.) | `4055381 0030` |
| **J** | **Situação do Diagrama** | Base Diagramas / Validação | `OK` |

---

## 🚀 Como Executar pelo Menu `🔄 Automação 5G`

Ao abrir a planilha no Google Sheets, o menu superior **`🔄 Automação 5G`** é criado automaticamente via função `onOpen()`:

* **`🚀 Sincronizar Tudo (Sytex ➔ Integração ➔ Diagramas)`**:
  Executa o ciclo completo de ponta a ponta na aba do mês que estiver aberta no momento.
* **`📡 1. Testar Ingestão Sytex API (.xlsx)`**:
  Testa a conexão e credenciais com o Sytex, exibindo a contagem e uma amostra dos sites extraídos.
* **`📋 2. Conciliar Apenas Integração e Sytex`**:
  Executa a conciliação entre Sytex e a planilha de Integrações.
* **`🗺️ 3. Atualizar Apenas Diagramas de Rede`**:
  Atualiza ou revalida apenas as colunas de diagramas (G a J) para os sites já listados na tabela.
* **`⚙️ Configurar Acesso Sytex (Senha)`**:
  Permite cadastrar ou atualizar a senha da API Sytex de forma segura via prompt na tela sem necessidade de alterar o código-fonte.
