# Automação de Cruzamento e Tratamento de Dados GPON

Este módulo faz parte do **Sistema de Gestão de Contratos** e automatiza o cruzamento de dados de sites GPON a partir de 3 planilhas de origem, tratando, padronizando e consolidando as informações na planilha destino.

---

## 📌 Visão Geral do Fluxo

```
Planilha 01 (DEMANDAS COMPRAS)  ──┐
Aba: "NEGOCIAÇÕES GPON" (Col C)   │
                                  ├─► [Motor Apps Script: Cascata + Tratamento] ─► Planilha Destino (Links - Tratados)
Planilha 02 (Operacional/Ativação)├─┘
Planilha 03 (Contratos/Comercial) ┘
```

1. **Unicidade de Sites:** Extrai os sites únicos a partir da **Coluna C** da Planilha 01 (DEMANDAS COMPRAS).
2. **Busca em Cascata (Fallback):**
   - Para qualquer coluna, se o dado estiver em branco na Planilha 01, busca na Planilha 02.
   - Se ainda estiver em branco, busca na Planilha 03.
   - Caso não seja encontrado em nenhuma das 3 planilhas, preenche com **`NÃO ENCONTRADO`**.
3. **Padronização em Maiúsculas:** Todos os textos e indicadores (ex.: Fornecedor, Atendimento, Plano, Sim/Não, Vigência) são padronizados em caixa alta (`MAIÚSCULO`).
4. **Formatação Profissional:** Valores monetários em `R$ #,##0.00`, datas em `DD/MM/AAAA`, números inteiros com separador de milhar e cabeçalho estilizado.

---

## 📊 Mapeamento das 12 Colunas de Destino

| # | Coluna | Formato | Tratamento e Fallback |
|---|---|---|---|
| 1 | **SITES** | Texto | Chave primária (sem espaços, maiúsculo) |
| 2 | **POPULAÇÃO** | Inteiro (`#,##0`) | Dígitos numéricos ou `NÃO ENCONTRADO` |
| 3 | **MÊS DE ATIVAÇÃO** | Texto / `MM/AAAA` | Mês padronizado em maiúsculo ou `NÃO ENCONTRADO` |
| 4 | **FORNECEDOR** | Texto | Fornecedor/Operadora em maiúsculo ou `NÃO ENCONTRADO` |
| 5 | **TIPO DE ATENDIMENTO** | Texto | Tecnologia (ex.: GPON, PTP) em maiúsculo ou `NÃO ENCONTRADO` |
| 6 | **PLANO CONTRATADO** | Texto | Velocidade/Capacidade em maiúsculo ou `NÃO ENCONTRADO` |
| 7 | **VALOR DA CONTRATAÇÃO** | Moeda (`R$ #,##0.00`) | Valor mensal numérico ou `NÃO ENCONTRADO` |
| 8 | **TAXA DE INSTALAÇÃO** | Texto | `SIM` / `NÃO` em maiúsculo ou `NÃO ENCONTRADO` |
| 9 | **VALOR INSTALAÇÃO** | Moeda (`R$ #,##0.00`) | Valor de instalação numérico ou `NÃO ENCONTRADO` |
| 10 | **DATA DE ATIVAÇÃO** | Data (`DD/MM/AAAA`) | Data formatada ou `NÃO ENCONTRADO` |
| 11 | **DATA ASSINATURA DO CONTRATO** | Data (`DD/MM/AAAA`) | Data formatada ou `NÃO ENCONTRADO` |
| 12 | **VIGÊNCIA DO CONTRATO** | Texto | Período (ex.: `12 MESES`) ou `NÃO ENCONTRADO` |

---

## 🚀 Como Instalar e Usar no Google Sheets

1. Abra a [Planilha de Destino](https://docs.google.com/spreadsheets/d/1HUIi3NBEp4N-fJqByEKC_ZFRAqMi82sVk670ry0MZ6I/edit?pli=1&gid=1200272248#gid=1200272248).
2. Acesse o menu superior: **Extensões** > **Apps Script**.
3. No arquivo `Código.gs`, cole o conteúdo do arquivo [`Codigo.gs`](./Codigo.gs).
4. No arquivo de manifesto `appsscript.json` (se habilitado nas configurações), cole o conteúdo de [`appsscript.json`](./appsscript.json).
5. Clique em **Salvar (💾)**.
6. Selecione a função `cruzarDadosPlanilhas` e clique em **Executar (▶️)**.
7. **Autorização inicial:** Conceda a permissão solicitada pelo Google para leitura e escrita das planilhas.
8. Ao recarregar a planilha no navegador, use o menu personalizado no topo:
   - **🚀 Integração GPON** > **🔄 Cruzar e Atualizar Dados**
   - **🚀 Integração GPON** > **🔍 Diagnosticar Colunas das Planilhas**

---

## 🛠️ Arquivos do Módulo

- `Codigo.gs`: Código fonte completo do Apps Script com motor de busca em cascata, tolerância de cabeçalhos por regex e gravação em lote.
- `appsscript.json`: Configurações de fuso horário (`America/Sao_Paulo`) e permissões OAuth.
