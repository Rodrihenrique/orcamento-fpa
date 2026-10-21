# 🚗 Automação de Abastecimento e Manutenção de Frotas

Módulo em **Google Apps Script** para importação automática de extratos de faturamento de combustível e manutenção de veículos (arquivos `.xlsx` e `.csv`) para as planilhas de custos mensais da gerência (**OPERAÇÃO E MANUTENÇÃO DE REDES**).

---

## 🎯 Objetivo e Filtros Automáticos

Eliminar o trabalho manual de cópia e tratamento de dados dos arquivos baixados dos cartões de frota (Ticket Log / RFCV), alimentando diretamente as duas abas da planilha mensal:
1. **`Base_Abastecimento`**: Lançamentos detalhados de combustível (4 colunas).
2. **`Base_Manutenção`**: Lançamentos detalhados de oficinas, peças e lavagens com tipo de estabelecimento (5 colunas).

### 🔍 Funcionalidades de Precisão:
- **Suporte Nativo a `.xlsx` e `.csv`**: Converte e processa diretamente planilhas Excel (.xlsx) e arquivos delimitados (.csv).
- **Limpeza e Relançamento Estrito**: A cada execução, os dados anteriores da aba (a partir da linha 2) são completamente limpos e os novos dados são gravados a partir da linha 2. Nunca duplica ou empilha dados no fim da planilha.
- **Filtro Mensal Dinâmico:** O script identifica o mês e ano no título da planilha aberta (ex.: `10. CUSTOS DO SETOR - OUTUBRO - 2026` -> Outubro/2026). As transações são validadas pela data do cupom: **apenas os registros do mês da planilha são importados**; transações de outros meses são automaticamente ignoradas.
- **Filtro de Colaboradores:** Apenas colaboradores presentes na **Coluna A da aba `Custos_Totais`** têm seus lançamentos importados, garantindo que carros de outros setores não entrem na planilha.

---

## 📁 Arquitetura dos Arquivos

- **[`Codigo.js`](./Codigo.js)**: Código-fonte do Google Apps Script com as funções `importarDadosAbastecimento`, `importarDadosManutencao`, `testarConexoes`, menu `onOpen()`, filtros mensais e utilitários de tratamento de CSV e conversão numérica.
- **[`appsscript.json`](./appsscript.json)**: Manifesto de configuração do projeto com timezone `America/Fortaleza`.
- **[`GUIA_DE_ATIVACAO.md`](./GUIA_DE_ATIVACAO.md)**: Manual detalhado de ativação, incluindo instruções de uso do menu `🚗 Gestão de Frota`.

---

## 🔗 Links das Pastas no Google Drive

- **Pasta Raiz 2026 (Planilhas Mensais):** [Pasta 2026](https://drive.google.com/drive/folders/1P-QIZVEhADgyZk62snW9nDcV8E_4vLRU)
- **Pasta CSV Combustível:** [Combustível - Frotas Telefonia](https://drive.google.com/drive/folders/1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs)
- **Pasta CSV Manutenção:** [Manutenção - Frota Telefonia](https://drive.google.com/drive/folders/1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2)

---

## 🚀 Como Ativar

Consulte as instruções passo a passo no [**`GUIA_DE_ATIVACAO.md`**](./GUIA_DE_ATIVACAO.md).
