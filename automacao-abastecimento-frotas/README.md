# 💰 Gestão de Custos do Setor: Frota, Viagens e Atividades

Módulo integrado em **Google Apps Script** para importação e tratamento automatizado de custos mensais da gerência (**OPERAÇÃO E MANUTENÇÃO DE REDES**):
1. **Frota Unificada (Combustível e Manutenção)**: Leitura de arquivo único `.xlsx` ou `.csv` contendo todas as despesas da frota em uma pasta principal do Google Drive, com separação automática para as bases de abastecimento e manutenção.
2. **Viagens (Alimentação e Hospedagem)**: Extração e tratamento de despesas a partir da planilha oficial `CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026`.
3. **Atividades (Chamados de Manutenção)**: Extração e tratamento de ordens de serviço e chamados de manutenção a partir da planilha oficial `CHAMADOS`, alimentando a aba `Atividades`.

---

## 🎯 Abas Alimentadas e Regras de Negócio

### 1. `Base_Abastecimento` (Frota)
- **Origem:** Arquivo único na pasta principal de Frota no Drive (`Frota Telefonia - Combustível e Manutenção`).
- **Classificação:** Registros onde a **Coluna C (`NOME REDUZIDO`)** contém `BRISANET ABASTECIMENTO`.
- **Colunas (Linha 2 em diante):** `NOME MOTORISTA` (Col K) | `VALOR EMISSAO` (Col S) | `PERÍODO` | `DATA/HORA` (Col D).
- **Limpeza:** Linha 2 em diante limpa e relançada a cada importação.

### 2. `Base_Manutenção` (Frota)
- **Origem:** Arquivo único na pasta principal de Frota no Drive (`Frota Telefonia - Combustível e Manutenção`).
- **Classificação:** Registros onde a **Coluna C (`NOME REDUZIDO`)** contém `BRISANET MANUTENCAO`.
- **Colunas (Linha 2 em diante):** `NOME MOTORISTA` (Col K) | `VALOR EMISSAO` (Col S) | `TIPO ESTABELECIMENTO` (Col V) | `PERÍODO` | `DATA/HORA` (Col D).
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

### 4. `Atividades` (Chamados de Manutenção)
- **Origem:** Planilha Oficial [OPERAÇÃO E MANUTENÇÃO DE REDES 2026](https://docs.google.com/spreadsheets/d/1StP5J5j_9V_8IEr1DmbvW1M6dEA4ptfEVcScfkV4FJM/edit?gid=1755873954#gid=1755873954).
- **Destino:** Aba `Atividades` da planilha de custos mensais (da linha 3 em diante).
- **Mapeamento de Colunas (12 Colunas - A até L):**
  - **A (`Serviço`):** Coluna R (`CATEGORIA`) da aba CHAMADOS.
  - **B (`Tipo`):** `"Manutenção"` estrito (todas as ordens de serviço vindas de CHAMADOS são de manutenção).
  - **C (`Categoria`):** `"CAPEX"` padronizado.
  - **D (`Site`):** Coluna B (`SITE`).
  - **E (`Estado`):** Coluna G (`UF`).
  - **F (`Projeto`):** Mapeado automaticamente a partir da UF/Estado via busca dinâmica na planilha de Capex de Manutenção (`CE01`/`CE02`, `RN01`, `PB01`, `PE01`, `PI01`, `BA01`, `AL01`, `SE01`).
  - **G (`Diagrama de Rede`):** Mapeado dinamicamente a partir dos itens de `"Mão de Obra"` por estado na aba `Capex de man. - 5G` da planilha oficial de diagramas (ex.: `4023987 0020`, `4023989 0020`, `4023990 0020`, `4023995 0020`, `4023991 0020`, `4023992 0020`, `4023993 0020`, `4023994 0020`).
  - **H (`Responsável Equipe`):** Coluna V (`EQUIPE`), com remoção automática do texto `"MNT."`, remoção de hífens e padronização no formato `"EQUIPE 01"`, `"EQUIPE 02"`, etc. (com fallback automático para `Custos_Totais` caso esteja `#N/A` ou em branco).
  - **I (`Responsável Técnico`):** Coluna U (`COLABORADOR`).
  - **J (`SLA Hora`):** Coluna N (`HORAS TRABALHADAS`), convertida em fração decimal de dia e formatada como `[h]:mm:ss`.
  - **K (`SLA Decimal`):** Fórmula `=J{linha}` formatada como decimal.
  - **L (`Horas Totais`):** Fórmula `=K{linha}` formatada como decimal.
- **Preservação de Expansão:** As linhas com `Tipo` igual a `"Expansão"` (lançamentos de Placas/Expansões provenientes de outras fontes) e os cabeçalhos das linhas 1 e 2 são **preservados rigorosamente intactos**.
- **Filtro de Exclusão de Tecnologia 5.8:** Chamados com tecnologia `"5.8"` na Coluna E (`TECNOLOGIA`) são desconsiderados e não entram na importação.
- **Filtro de Exclusão de Equipe Interna:** Chamados atribuídos à `EQUIPE MNT. - INTERNA.` (Coluna V) são desconsiderados e não entram na importação.


---

## 🚗 Estrutura do Arquivo Unificado de Frota (39 Colunas - A até AM)

O arquivo único de extrato contém 39 colunas padronizadas:

| Coluna | Letra | Campo Oficial | Utilização na Automação |
|---|---|---|---|
| 0 | **A** | `CODIGO TRANSACAO` | Identificador único |
| 1 | **B** | `CODIGO CLIENTE` | Código da conta |
| 2 | **C** | `NOME REDUZIDO` | **Classificação:** `BRISANET ABASTECIMENTO` ou `BRISANET MANUTENCAO` |
| 3 | **D** | `DATA TRANSACAO` | **Data/Hora da transação** (preserva fuso real) |
| 4 | **E** | `PLACA` | Placa do veículo |
| 5 | **F** | `TIPO FROTA` | Tipo de frota |
| 6 | **G** | `MODELO VEICULO` | Modelo do veículo |
| 7 | **H** | `NUMERO FROTA` | Número de frota |
| 8 | **I** | `ANO` | Ano do veículo |
| 9 | **J** | `MATRICULA` | Matrícula do colaborador |
| 10 | **K** | `NOME MOTORISTA` | **Nome do Colaborador** (validado em `Custos_Totais`) |
| 11 | **L** | `SERVICO` | Descrição do serviço / fallback |
| 12 | **M** | `TIPO COMBUSTIVEL` | Tipo do combustível |
| 13 | **N** | `LITROS` | Volume abastecido |
| 14 | **O** | `VL/LITRO` | Valor unitário do litro |
| 15 | **P** | `HODOMETRO OU HORIMETRO` | Leitura do odômetro/horímetro |
| 16 | **Q** | `KM RODADOS OU HORAS TRABALHADAS` | Distância / tempo |
| 17 | **R** | `KM/LITRO OU LITROS/HORA` | Desempenho / média |
| 18 | **S** | `VALOR EMISSAO` | **Valor monetário (R$)** |
| 19 | **T** | `CODIGO ESTABELECIMENTO` | Código do posto / fornecedor |
| 20 | **U** | `NOME ESTABELECIMENTO` | Nome do posto / fornecedor |
| 21 | **V** | `TIPO ESTABELECIMENTO` | **Tipo / Ramo** (utilizado na `Base_Manutenção`) |
| 22-38 | **W-AM** | *Demais campos cadastrais* | Endereço, Cidade, UF, Restrições, Cartão, etc. |

---

## 📂 Estrutura de Pastas no Google Drive

1. **Pasta Principal de Frota:** `Frota Telefonia - Combustível e Manutenção`
   - Onde o operador adiciona o arquivo único de extrato (`.xlsx` ou `.csv`).
   - Se ainda não existir, o próprio script a cria automaticamente no Drive!
2. **Subpasta de Histórico:** `Arquivos Processados`
   - Criada automaticamente dentro da pasta principal.
   - Assim que o arquivo é importado, ele é movido para cá para evitar duplicidades.
   - Se necessário, pode ser reprocessado a qualquer momento pelo menu.

---

## 🔍 Filtros e Tratamentos Automáticos

- **Filtro de Colaboradores:** Apenas colaboradores presentes na **Coluna A da aba `Custos_Totais`** de cada planilha têm seus lançamentos importados.
- **Filtro de Competência Mensal:** Lançamentos são filtrados rigorosamente pelo mês da planilha ativa (ex.: Outubro/2026 para a planilha `10. CUSTOS DO SETOR - OUTUBRO - 2026`).
- **Formatação Monetária:** Valores convertidos automaticamente para números decimais reais e formatados como moeda (`R$ #,##0.00`).
- **Processamento em Lotes (Chunks):** Blocos de 2.000 linhas preservando a memória do Apps Script e fuso horário real.
- **Abrangência Temporal (Julho/2026 em diante):** Válido a partir de **JULHO/2026**. Planilhas de Janeiro a Junho possuem formato anterior e são mantidas intactas.

---

## 📁 Arquivos do Projeto

- **[`Codigo.js`](./Codigo.js)**: Código-fonte do Google Apps Script com a importação unificada de Frota, Viagens, Sincronização em Massa, criação dinâmica de pastas e diagnósticos.
- **[`appsscript.json`](./appsscript.json)**: Manifesto com timezone `America/Fortaleza`, escopos de Sheets e Drive v2 habilitado.
- **[`GUIA_DE_ATIVACAO.md`](./GUIA_DE_ATIVACAO.md)**: Manual passo a passo para configuração e uso na planilha Google.

---

## 🔗 Links Oficiais

- **Pasta Raiz 2026 (Planilhas Mensais):** [Pasta 2026](https://drive.google.com/drive/folders/1P-QIZVEhADgyZk62snW9nDcV8E_4vLRU)
- **Planilha Exemplo (Outubro/2026):** [10. CUSTOS DO SETOR - OUTUBRO - 2026](https://docs.google.com/spreadsheets/d/1wdaKA7fKHSlqMGAdK9fLvppLeGqY0GWe9pF9cOYFQHI/edit?gid=392571569)
- **Planilha Origem de Viagens:** [CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026](https://docs.google.com/spreadsheets/d/1ETgxoOa4LyfZGTMYsTgMlEPyFHCDP43VH9dUNdTqYEk/edit?gid=1863439256)
- **Planilha Origem de Chamados:** [OPERAÇÃO E MANUTENÇÃO DE REDES 2026](https://docs.google.com/spreadsheets/d/1StP5J5j_9V_8IEr1DmbvW1M6dEA4ptfEVcScfkV4FJM/edit?gid=1755873954#gid=1755873954)
- **Planilha Origem de Diagramas (Capex de Manutenção 5G):** [DIAGRAMAS DE REDE - 5G](https://docs.google.com/spreadsheets/d/1fd5sieHnEMixKJh8T7qYNwZfecL453cGqqkYl41VdaA/edit?gid=1470699754#gid=1470699754) (Aba `Capex de man. - 5G`)
