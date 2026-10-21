# 🚗 Automação de Abastecimento e Manutenção de Frotas

Módulo em **Google Apps Script** para importação automática de extratos de faturamento de combustível e manutenção de veículos (arquivos `RFCV_*.csv`) para as planilhas de custos mensais da gerência (**OPERAÇÃO E MANUTENÇÃO DE REDES**).

---

## 🎯 Objetivo

Eliminar o trabalho manual de cópia e tratamento de dados dos arquivos CSV baixados dos cartões de frota (Ticket Log / RFCV), alimentando diretamente as duas abas da planilha mensal:
1. **`Base_Abastecimento`**: Lançamentos detalhados de combustível.
2. **`Base_Manutenção`**: Lançamentos detalhados de oficinas, peças e lavagens com tipo de estabelecimento.

Os motoristas importados são filtrados automaticamente a partir da lista de colaboradores cadastrada na aba **`Custos_Totais`** (Coluna A) da própria planilha.

---

## 📁 Arquitetura dos Arquivos

- **[`Codigo.js`](./Codigo.js)**: Código-fonte do Google Apps Script com as funções `importarDadosAbastecimento`, `importarDadosManutencao`, `testarConexoes` e utilitários de tratamento de CSV e conversão numérica.
- **[`appsscript.json`](./appsscript.json)**: Manifesto de configuração do projeto com timezone `America/Fortaleza`.
- **[`GUIA_DE_ATIVACAO.md`](./GUIA_DE_ATIVACAO.md)**: Manual detalhado de ativação, incluindo instruções de como criar os botões interativos nas abas da planilha.

---

## 🔗 Links das Pastas no Google Drive

- **Pasta Raiz 2026 (Planilhas Mensais):** [Pasta 2026](https://drive.google.com/drive/folders/1P-QIZVEhADgyZk62snW9nDcV8E_4vLRU)
- **Pasta CSV Combustível:** [Combustível - Frotas Telefonia](https://drive.google.com/drive/folders/1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs)
- **Pasta CSV Manutenção:** [Manutenção - Frota Telefonia](https://drive.google.com/drive/folders/1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2)

---

## 🚀 Como Ativar

Consulte as instruções passo a passo no [**`GUIA_DE_ATIVACAO.md`**](./GUIA_DE_ATIVACAO.md).
