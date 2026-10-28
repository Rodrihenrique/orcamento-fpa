# Automação de Diagramas 5G | Integração de Sites

Módulo em **Google Apps Script** para busca automatizada de chamados de integração de tecnologia 5G e preenchimento de diagramas entre a planilha de controle mensal, a planilha de chamados de integração e a matriz de diagramas.

---

## 🎯 Objetivo e Fluxo de Funcionamento

O módulo conecta **3 fontes de dados** para automatizar o ciclo completo mensal:

1. **Planilha de Integração (`INTEGRAÇÃO E EXPANSÃO DE SITES 2026` / aba `INTEGRAÇÃO DE SITES`):**
   * Lê os chamados de integração finalizados no mês da aba de destino (ex.: `OUT/2026`, `NOV/2026`).
   * Valida a **Data de Finalização na Coluna P**.
   * Avalia o fornecedor/responsável na **Coluna L**:
     * **`BRISANET`** $\rightarrow$ Preenche o código do site na **Coluna K** (Integrado por nós - Huawei).
     * **`FIBERHOME`** $\rightarrow$ Preenche o código do site na **Coluna H** (Outros Vendors).
     * **Vazio** $\rightarrow$ Linhas sem preenchimento na Coluna L são **ignoradas**, sendo importadas apenas quando forem preenchidas.

2. **Matriz Oficial de Diagramas (`Diagramas - 5G`):**
   * Busca e preenche os diagramas nas colunas correspondentes:
     * **Coluna H (Sites - FIBERHOME)** $\rightarrow$ Preenche o diagrama na **Coluna I**.
     * **Coluna K (Sites - BRISANET)** $\rightarrow$ Preenche o diagrama na **Coluna L**.

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
| `colOrigemVendor` | Coluna do fornecedor/responsável | `11` (Coluna L: BRISANET / FIBERHOME) |
| `colOrigemDataFinalizacao` | Coluna da data de finalização | `15` (Coluna P) |
| `colDestinoBrisanet` | Coluna de destino para sites Brisanet | `'K'` (Integrado por nós) |
| `colDestinoFiberhome` | Coluna de destino para sites Fiberhome | `'H'` (Outros Vendors) |
| `idOrigemDiagramas` | ID da Planilha Base de Diagramas | `1fd5sieHnEMixKJh8T7qYNwZfecL453cGqqkYl41VdaA` |
| `abaOrigemDiagramas` | Aba da matriz de diagramas | `Diagramas - 5G` |

---

## 🚀 Como Executar

Ao abrir a planilha no Google Sheets, o menu **`🔄 Atualizar Diagramas`** exibirá três opções:

* **`🚀 Sincronizar Tudo (Importar Sites + Buscar Diagramas)`**:
  Executa o ciclo ponta a ponta: busca os chamados finalizados no mês da aba ativa, distribui os sites nas Colunas H (Fiberhome) e K (Brisanet) e, em seguida, preenche os diagramas nas Colunas I e L.
* **`📥 1. Importar Chamados de Integração (Colunas H e K)`**:
  Importa somente a lista de sites do mês dividida por fornecedor nas Colunas H e K.
* **`🔍 2. Buscar Diagramas (Colunas I e L)`**:
  Atualiza apenas as colunas de diagramas (I e L) com base nos sites existentes em H e K.

---

## 🛠️ Regras de Negócio e Otimizações

* **Separação por Vendor (Coluna L):** Divide os sites automaticamente entre Brisanet (Col K) e Fiberhome (Col H) e descarta chamados onde a coluna L ainda não foi preenchida.
* **Filtro Mensal Dinâmico:** Identifica mês e ano a partir do nome da aba ativa (`OUT/2026`, `NOV/2026`, etc.).
* **Leitura Robusta de Datas:** Coluna P suporta objetos Date, strings `DD/MM/YYYY`, ISO e números seriais.
* **Deduplicação Inteligente:** Evita repetição do mesmo código de site no mesmo grupo e mês.
* **Pré-normalização em Memória:** Varredura rápida da base de diagramas sem risco de timeout.
