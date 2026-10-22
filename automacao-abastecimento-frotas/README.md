# 💰 Gestão de Custos do Setor: Frota e Viagens

Módulo integrado em **Google Apps Script** para importação e tratamento automatizado de custos mensais da gerência (**OPERAÇÃO E MANUTENÇÃO DE REDES**):
1. **Frota (Combustível e Manutenção)**: Leitura de arquivos `.xlsx` e `.csv` no Google Drive com processamento em blocos (chunks).
2. **Viagens (Alimentação e Hospedagem)**: Extração e tratamento de despesas a partir da planilha oficial `CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026`.

---

## 🎯 Abas Alimentadas e Regras de Negócio

### 1. `Base_Abastecimento` (Frota)
- **Origem:** Arquivos `.xlsx` ou `.csv` na pasta [Combustível - Frotas Telefonia](https://drive.google.com/drive/folders/1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs).
- **Colunas (Linha 2 em diante):** `NOME MOTORISTA` | `VALOR EMISSAO` | `PERÍODO` | `DATA/HORA`.
- **Limpeza:** Linha 2 em diante limpa e relançada a cada importação.

### 2. `Base_Manutenção` (Frota)
- **Origem:** Arquivos `.xlsx` ou `.csv` na pasta [Manutenção - Frota Telefonia](https://drive.google.com/drive/folders/1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2).
- **Colunas (Linha 2 em diante):** `NOME MOTORISTA` | `VALOR EMISSAO` | `TIPO ESTABELECIMENTO` | `PERÍODO` | `DATA/HORA`.
- **Limpeza:** Linha 2 em diante limpa e relançada a cada importação.

### 3. `Base_Viagens` (Viagens)
- **Origem:** Planilha [CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026](https://docs.google.com/spreadsheets/d/1ETgxoOa4LyfZGTMYsTgMlEPyFHCDP43VH9dUNdTqYEk).
- **Estrutura:**
  - **Linha 1:** Cabeçalhos de Seção (`Alimentação` em A:C; `Hospedagem` em F:H).
  - **Linha 2:** Cabeçalhos de Coluna:
    - **A:** `COLABORADOR`
    - **B:** `VALOR TOTAL`
    - **C:** `MÊS DO LANÇAMENTO - SAP`
    - **D:** `nome corrigido` (preservada intacta / nunca sobrescrita)
    - **E:** Espaço em branco (preservada intacta)
    - **F:** `COLABORADOR`
    - **G:** `VALOR DIÁRIA`
    - **H:** `MÊS DO LANÇAMENTO - SAP`
  - **Linha 3 em diante:** Lançamentos das despesas.
- **Regra de Limpeza:** Limpa rigorosamente da **linha 3 em diante** apenas nas colunas **A:C** e **F:H**. Cabeçalhos (linhas 1 e 2) e Coluna D (`nome corrigido`) permanecem intactos.

---

## 🔍 Filtros e Tratamentos Automáticos

- **Filtro de Colaboradores:** Apenas colaboradores presentes na **Coluna A da aba `Custos_Totais`** de cada planilha têm seus lançamentos importados.
- **Filtro de Competência Mensal:** Lançamentos são filtrados rigorosamente pelo mês da planilha ativa (ex.: Outubro/2026 para a planilha `10. CUSTOS DO SETOR - OUTUBRO - 2026`).
- **Formatação Monetária:** Valores convertidos automaticamente para números decimais reais e formatados como moeda (`R$ #,##0.00`).
- **Suporte Nativo a `.xlsx` e `.csv` em Lotes:** Processamento particionado em blocos de 2.000 linhas, preservando a memória e a hora real do extrato sem distorções de fuso horário.
- **Abrangência Temporal (Julho/2026 em diante):** Válido a partir de **JULHO/2026** (Julho a Outubro e próximos meses). Planilhas de Janeiro a Junho possuem formato anterior e são mantidas intactas.

---

## 📁 Arquivos do Projeto

- **[`Codigo.js`](./Codigo.js)**: Código-fonte do Google Apps Script com todas as funções de importação de Frota, Viagens, Sincronização em Lote, menu unificado e diagnósticos.
- **[`appsscript.json`](./appsscript.json)**: Manifesto com timezone `America/Fortaleza`, escopos de Sheets e Drive v2 habilitado.
- **[`GUIA_DE_ATIVACAO.md`](./GUIA_DE_ATIVACAO.md)**: Manual passo a passo para configuração e uso na planilha Google.

---

## 🔗 Links Oficiais

- **Pasta Raiz 2026 (Planilhas Mensais):** [Pasta 2026](https://drive.google.com/drive/folders/1P-QIZVEhADgyZk62snW9nDcV8E_4vLRU)
- **Planilha Exemplo (Outubro/2026):** [10. CUSTOS DO SETOR - OUTUBRO - 2026](https://docs.google.com/spreadsheets/d/1wdaKA7fKHSlqMGAdK9fLvppLeGqY0GWe9pF9cOYFQHI/edit?gid=392571569)
- **Planilha Origem de Viagens:** [CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026](https://docs.google.com/spreadsheets/d/1ETgxoOa4LyfZGTMYsTgMlEPyFHCDP43VH9dUNdTqYEk/edit?gid=1863439256)
- **Pasta Combustível:** [Combustível - Frotas Telefonia](https://drive.google.com/drive/folders/1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs)
- **Pasta Manutenção:** [Manutenção - Frota Telefonia](https://drive.google.com/drive/folders/1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2)
