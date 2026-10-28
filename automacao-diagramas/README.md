# Automação de Diagramas 5G | Integração de Sites

Módulo em **Google Apps Script** para busca automatizada de chamados de integração de tecnologia 5G e preenchimento de diagramas entre a planilha de controle mensal, a planilha de chamados de integração e a matriz de diagramas.

---

## 🎯 Objetivo e Fluxo de Funcionamento

O módulo conecta **3 fontes de dados** para automatizar o ciclo completo mensal:

1. **Planilha de Integração (`INTEGRAÇÃO E EXPANSÃO DE SITES 2026` / aba `INTEGRAÇÃO DE SITES`):**
   * Lê os chamados de integração finalizados no mês da aba de destino (ex.: `OUT/2026`, `NOV/2026`).
   * Valida a **Data de Finalização na Coluna P**.
   * Extrai os **Códigos dos Sites na Coluna A** correspondentes.
   * Preenche a lista na **Coluna K** (Sites Integrados por nós / Huawei) a partir da linha 4.

2. **Matriz Oficial de Diagramas (`Diagramas - 5G`):**
   * Busca e preenche os diagramas nas colunas correspondentes:
     - **Coluna H (Sites - Outros Vendors)** $\rightarrow$ Preenche o diagrama na **Coluna I**.
     - **Coluna K (Sites - Integrado por nós / Huawei)** $\rightarrow$ Preenche o diagrama na **Coluna L**.

---

## ⚙️ Configuração

As configurações de conexão e parâmetros estão centralizados no objeto `CONFIG` dentro de [`Codigo.js`](./Codigo.js):

| Parâmetro | Descrição | Padrão / Observação |
| :--- | :--- | :--- |
| `idDestino` | ID da Planilha Mensal de Controle | `1672Af0imskRY3ywO7H089Z_unKtXpw7jSHnLSDqAFPw` |
| `abaDestinoPadrao` | Aba mensal padrão (fallback) | `OUT/2026` *(detecta automaticamente a aba ativa do mês)* |
| `linhaInicial` | Linha onde iniciam os dados dos sites | `4` |
| `nomePlanilhaIntegracao` | Nome da planilha de chamados | `INTEGRAÇÃO E EXPANSÃO DE SITES 2026` |
| `idOrigemIntegracao` | ID da planilha de chamados | `1_DW_lJl0wsgXrjnJOEhD1vo-tLDzvTnE8u-fUIhhwK4` |
| `gidOrigemIntegracao` | GID da aba de chamados | `1755873954` |
| `abaOrigemIntegracao` | Aba de chamados de integração | `INTEGRAÇÃO DE SITES` |
| `colOrigemSite` | Coluna do código do site na origem | `0` (Coluna A) |
| `colOrigemDataFinalizacao` | Coluna da data de finalização | `15` (Coluna P) |
| `colDestinoSitesIntegrados` | Coluna de destino dos sites importados | `'K'` (Integrado por nós) |
| `idOrigemDiagramas` | ID da Planilha Base de Diagramas | `1fd5sieHnEMixKJh8T7qYNwZfecL453cGqqkYl41VdaA` |
| `abaOrigemDiagramas` | Aba da matriz de diagramas | `Diagramas - 5G` |

---

## 🚀 Como Executar

Ao abrir a planilha no Google Sheets, o menu **`🔄 Atualizar Diagramas`** exibirá três opções:

* **`🚀 Sincronizar Tudo (Importar Sites + Buscar Diagramas)`**:
  Executa o ciclo ponta a ponta: busca os chamados finalizados no mês da aba ativa, preenche a Coluna K e, em seguida, preenche os diagramas nas Colunas I e L.
* **`📥 1. Importar Chamados de Integração (Coluna K)`**:
  Importa somente a lista de sites finalizados no mês para a Coluna K.
* **`🔍 2. Buscar Diagramas (Colunas I e L)`**:
  Atualiza apenas as colunas de diagramas (I e L) com base nos sites existentes em H e K.

---

## 🛠️ Regras de Negócio e Otimizações

* **Filtro Mensal Dinâmico:** O script identifica o mês e o ano a partir do nome da aba ativa (ex.: `OUT/2026`, `NOV/2026`, `DEZ/2026`, `JAN/2027`), permitindo que a mesma automação funcione mês a mês sem alteração no código.
* **Leitura Robusta de Datas:** A Coluna P suporta formato nativo Date, strings no padrão brasileiro (`DD/MM/YYYY` com ou sem hora), padrão ISO e datas seriais.
* **Deduplicação de Sites:** Garante que o mesmo site não seja inserido repetido no lote mensal.
* **Pré-normalização em Memória:** Varre a matriz de diagramas uma única vez com normalização prévia e regex de palavra inteira, eliminando riscos de timeout.
