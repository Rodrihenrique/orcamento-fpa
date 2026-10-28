# Automação de Diagramas 5G | Integração de Sites

Módulo em **Google Apps Script** para busca e preenchimento automatizado de diagramas de integração de tecnologia 5G entre a planilha de controle mensal e a matriz de diagramas.

---

## 🎯 Objetivo

Preencher automaticamente os diagramas de integração nas colunas correspondentes com base nos códigos dos sites listados nas abas mensais de controle:
- **Coluna H (Sites - Outros Vendors)** $\rightarrow$ Preenche o diagrama na **Coluna I**.
- **Coluna K (Sites - Integrado por nós / Huawei)** $\rightarrow$ Preenche o diagrama na **Coluna L**.

O script faz a correspondência com a matriz oficial de diagramas localizada na aba `Diagramas - 5G`.

---

## ⚙️ Configuração

As configurações de conexão entre as planilhas estão no objeto `CONFIG` dentro de [`Codigo.js`](./Codigo.js):

| Parâmetro | Descrição | Valor Padrão |
| :--- | :--- | :--- |
| `idDestino` | ID da Planilha Mensal de Controle | `1672Af0imskRY3ywO7H089Z_unKtXpw7jSHnLSDqAFPw` |
| `abaDestinoNome` | Nome da aba mensal ativa | `OUT/2026` |
| `idOrigem` | ID da Planilha Base de Diagramas | `1fd5sieHnEMixKJh8T7qYNwZfecL453cGqqkYl41VdaA` |
| `abaOrigemNome` | Aba onde estão os diagramas | `Diagramas - 5G` |
| `linhaInicial` | Linha onde iniciam os dados dos sites | `4` |

---

## 🚀 Como Executar

1. Abra a planilha de controle no Google Sheets.
2. Ao carregar a página, o menu superior **`🔄 Atualizar Diagramas`** será criado automaticamente via trigger `onOpen()`.
3. Clique em **`🔄 Atualizar Diagramas`** > **`Rodar Script de Busca`**.
4. Uma notificação temporária (*toast*) informará o início do processamento.
5. Ao concluir, um modal apresentará o resumo completo:
   * Total de sites processados por grupo.
   * Total de diagramas encontrados e preenchidos.

---

## 🛠️ Otimizações Implementadas

* **Pré-normalização em Memória:** Processamento e normalização dos dados da aba de diagramas uma única vez antes do loop de busca, reduzindo o tempo de execução e evitando timeout do Apps Script.
* **Detecção Confiável da Última Linha:** Varredura reversa a partir da última linha para evitar cortes quando houver células em branco no meio do intervalo.
* **Match com Limite de Palavra (Regex):** Previne falsos positivos onde um site mais curto coincide com o prefixo de outro (ex: `SP01` e `SP012`).
* **Modularidade DRY:** Função parametrizada para processar qualquer par de colunas (Sites $\rightarrow$ Diagramas) sem duplicação de lógica.
