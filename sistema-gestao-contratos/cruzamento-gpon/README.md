# Automação de Cruzamento e Tratamento de Dados GPON

Este módulo faz parte do **Sistema de Gestão de Contratos** e automatiza o cruzamento de dados de sites GPON a partir das planilhas de origem, tratando, padronizando e consolidando as informações na planilha destino.

---

## 📌 Visão Geral do Fluxo

```
Planilha 01 (DEMANDAS COMPRAS)  ──┐
Aba: "NEGOCIAÇÕES GPON" (Col C)   │
                                  │
VISTORIA DE SITES (Aba DASH)   ───┼─► [Motor Apps Script: Cascata + Tratamento] ─► Planilha Destino (Links - Tratados)
(Col A: Site / Col C: Status)     │
                                  │
Planilha 02 (Operacional/Ativação)├─┘
Planilha 03 (Contratos/Comercial) ┘
```

1. **Unicidade de Sites e Divisão de Células:** Extrai os sites a partir da **Coluna C** da Planilha 01 (DEMANDAS COMPRAS). **Caso uma mesma célula contenha 2 ou mais sites** (separados por `/`, `,`, `;`, quebra de linha, `+` ou ` e `), o script divide a célula e gera uma linha individual para cada site.
2. **Coluna STATUS:** Compara o Site (Coluna C da P1) com a **Coluna A** da planilha **VISTORIA DE SITES** (aba `DASH`). Em caso de correspondência, captura o `STATUS` da **Coluna C**. Se não constar, preenche com **`NÃO ENCONTRADO`**.
3. **Busca em Cascata (Fallback):**
   - Para as demais colunas, se o dado estiver em branco na Planilha 01, busca na Planilha 02.
   - Se ainda estiver em branco, busca na Planilha 03.
   - Caso não seja encontrado em nenhuma das planilhas, preenche com **`NÃO ENCONTRADO`**.
4. **Padronização em Maiúsculas:** Todos os textos e indicadores (ex.: Status, Fornecedor, Atendimento, Plano, Sim/Não, Vigência) são padronizados em caixa alta (`MAIÚSCULO`).
5. **Formatação Profissional:** Valores monetários em `R$ #,##0.00`, datas em `DD/MM/AAAA`, números inteiros com separador de milhar e cabeçalho estilizado.

---

## 📊 Mapeamento das 13 Colunas de Destino

| # | Coluna | Formato | Origem / Tratamento e Fallback |
|---|---|---|---|
| 1 | **SITES** | Texto | Chave primária (Planilha 01, Coluna C - maiúsculo) |
| 2 | **STATUS** | Texto | **VISTORIA DE SITES (DASH, Col C)** ou `NÃO ENCONTRADO` |
| 3 | **POPULAÇÃO** | Inteiro (`#,##0`) | Dígitos numéricos ou `NÃO ENCONTRADO` |
| 4 | **MÊS DE ATIVAÇÃO** | Texto / `MM/AAAA` | Mês padronizado em maiúsculo ou `NÃO ENCONTRADO` |
| 5 | **FORNECEDOR** | Texto | Fornecedor/Operadora em maiúsculo ou `NÃO ENCONTRADO` |
| 6 | **TIPO DE ATENDIMENTO** | Texto | Tecnologia (ex.: GPON, PTP) em maiúsculo ou `NÃO ENCONTRADO` |
| 7 | **PLANO CONTRATADO** | Texto | Velocidade/Capacidade em maiúsculo ou `NÃO ENCONTRADO` |
| 8 | **VALOR DA CONTRATAÇÃO** | Moeda (`R$ #,##0.00`) | Valor mensal numérico ou `NÃO ENCONTRADO` |
| 9 | **TAXA DE INSTALAÇÃO** | Texto | `SIM` / `NÃO` em maiúsculo ou `NÃO ENCONTRADO` |
| 10 | **VALOR INSTALAÇÃO** | Moeda (`R$ #,##0.00`) | Valor de instalação numérico ou `NÃO ENCONTRADO` |
| 11 | **DATA DE ATIVAÇÃO** | Data (`DD/MM/AAAA`) | Data formatada ou `NÃO ENCONTRADO` |
| 12 | **DATA ASSINATURA DO CONTRATO** | Data (`DD/MM/AAAA`) | Data formatada ou `NÃO ENCONTRADO` |
| 13 | **VIGÊNCIA DO CONTRATO** | Texto | Período (ex.: `12 MESES`) ou `NÃO ENCONTRADO` |

---

## 🚀 Como Instalar e Usar no Google Sheets

1. Abra a [Planilha de Destino](https://docs.google.com/spreadsheets/d/1HUIi3NBEp4N-fJqByEKC_ZFRAqMi82sVk670ry0MZ6I/edit?pli=1&gid=1200272248#gid=1200272248).
2. Acesse o menu superior: **Extensões** > **Apps Script**.
3. No arquivo `Código.gs` (ou `cruzamento-gpon.gs`), cole o conteúdo do arquivo [`Codigo.gs`](./Codigo.gs).
4. No arquivo de manifesto `appsscript.json` (se habilitado nas configurações), cole o conteúdo de [`appsscript.json`](./appsscript.json).
5. Clique em **Salvar (💾)**.
6. Selecione a função `cruzarDadosPlanilhas` e clique em **Executar (▶️)**.
7. **Autorização inicial:** Conceda a permissão solicitada pelo Google para leitura e escrita das planilhas.
8. Ao recarregar a planilha no navegador, use o menu personalizado no topo:
   - **🚀 Integração GPON** > **🔄 Cruzar e Atualizar Dados**
   - **🚀 Integração GPON** > **🔍 Diagnosticar Colunas das Planilhas**

---

## 🛠️ Arquivos do Módulo

- `Codigo.gs`: Código fonte completo do Apps Script com cruzamento de Status, cascata, tolerância de cabeçalhos e gravação em lote.
- `appsscript.json`: Configurações de fuso horário (`America/Sao_Paulo`) e permissões OAuth.
