# 🚗 Automação de Abastecimento e Custos de Frotas

Módulo de automação em **Google Apps Script** para importação, processamento e consolidação de extratos de faturamento de abastecimento (Ticket Log / `RFCV_*.csv`) e manutenção de veículos do setor **OPERAÇÃO E MANUTENÇÃO DE REDES** (Gerência Executiva de Telefonia - Brisanet).

---

## 📂 Arquitetura do Módulo

- **[`Codigo.js`](./Codigo.js)**: Código-fonte do Google Apps Script com a lógica completa de parsing de CSV, mapeamento de colunas, formatação de valores, identificação de mês/período, filtro de colaboradores, movimentação de arquivos e menu do Google Sheets.
- **[`appsscript.json`](./appsscript.json)**: Manifesto de configuração do Apps Script com escopos OAuth necessários e fuso horário `America/Fortaleza`.
- **[`GUIA_DE_ATIVACAO.md`](./GUIA_DE_ATIVACAO.md)**: Manual passo a passo detalhado para instalação, configuração dos IDs, concessão de permissões, execução manual e agendamento de gatilhos automáticos.

---

## 🎯 Especificações de Dados (Aba `Base_Abastecimento`)

Os arquivos CSV recebidos contêm dados detalhados das transações de abastecimento. O script extrai e organiza os dados em 4 colunas canônicas:

| Coluna | Campo | Tipo | Descrição |
| :---: | :--- | :---: | :--- |
| **A** | `NOME MOTORISTA` | Texto | Nome completo do condutor associado à transação. |
| **B** | `VALOR EMISSAO` | Moeda / Numérico | Valor financeiro do abastecimento (formatado com casas decimais). |
| **C** | `PERÍODO` | Texto | Mês de competência por extenso (ex.: `OUTUBRO`). |
| **D** | `DATA TRANSACAO` | Data/Hora | Data e hora exata da emissão do cupom (ex.: `01/10/2026 07:02:13`). |

---

## 🧭 Estrutura de Pastas e Destino no Google Drive

```
Drive: Compartilhados comigo
 └─ CUSTOS DO SETOR
     └─ OPERAÇÃO E MANUTENÇÃO DE REDES
         └─ 2026
             ├─ 1. CUSTOS DO SETOR - JANEIRO - 2026
             ├─ ...
             ├─ 8. CUSTOS DO SETOR - AGOSTO- 2026
             ├─ 9. CUSTOS DO SETOR - SETEMBRO- 2026
             └─ 10. CUSTOS DO SETOR - OUTUBRO - 2026 ◄── [DESTINO ATUAL]
                 └─ Aba: Base_Abastecimento
```

---

## 🚀 Como Começar

Siga as instruções passo a passo no [**Guia de Ativação**](./GUIA_DE_ATIVACAO.md).
