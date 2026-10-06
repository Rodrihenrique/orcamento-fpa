# Sistema de Gestão e Acompanhamento de Contratos

Sistema profissional em **Google Apps Script** para controle, acompanhamento e registro de contratos com fornecedores, integrado diretamente à planilha corporativa do Google Sheets e com armazenamento automático de documentos no Google Drive.

---

## 1. Visão Geral e Estrutura dos Arquivos

O projeto é composto por:
* **`Code.gs`**: Backend em Google Apps Script responsável pela comunicação com o Google Sheets, criação automática de pastas no Google Drive, upload e decodificação dos arquivos anexados, preservação de fórmulas e fornecimento de dados para o painel.
* **`Index.html`**: Interface moderna, responsiva e corporativa (sem emojis), contendo o formulário de cadastro em seções lógicas, área de anexo de arquivos por **arrastar e soltar (Drag & Drop)** e o painel de listagem e consulta com busca dinâmica.
* **`appsscript.json`**: Manifesto de configuração com fuso horário e escopos de permissão necessários (Planilhas, Drive e Identidade).

---

## 2. Mapeamento Completo dos Campos (Colunas A até AF)

O formulário preenche rigorosamente as 32 colunas da aba de contratos da planilha:

| Coluna | Campo na Planilha | Origem no Formulário / Sistema |
| :---: | :--- | :--- |
| **A** | **ID** | Automático (calcula o próximo ID sequencial) ou manual se informado |
| **B** | **Centro de custo** | Campo de texto com autocompletar de centros existentes |
| **C** | **Categoria/Pacote** | Campo de texto com autocompletar (Ex: Compras, Serviços de Terceiros) |
| **D** | **Fornecedor** | Razão Social com lista de sugestões existentes |
| **E** | **CNPJ** | Entrada com máscara automática `00.000.000/0000-00` |
| **F** | **Objeto do contrato** | Descrição do serviço / fornecimento |
| **G** | **Gerente/Coordenador** | Responsável pela gestão do contrato |
| **H** | **Administrativo** | Apoio administrativo |
| **I** | **Tipo** | Vigente, Em Renovação, Novo, Aditivo, Spot |
| **J** | **Status** | Ativo, Em Renovação, Suspenso, Encerrado, Em Negociação |
| **K** | **Início da vigência** | Seletor de data (`AAAA-MM-DD` / `DD/MM/AAAA`) |
| **L** | **Fim da vigência** | Seletor de data (`AAAA-MM-DD` / `DD/MM/AAAA`) |
| **M** | **Renovação automática** | Não / Sim |
| **N** | **Moeda** | BRL, USD, EUR, GBP |
| **O** | **Valor por lançamento** | Entrada formatada em moeda |
| **P** | **Periodicidade** | Mensal, Bimestral, Trimestral, Semestral, Anual, Único |
| **Q** | **1ª competência** | Seletor de data de início contábil |
| **R** | **Data do reajuste** | Seletor de data de aniversário/reajuste |
| **S** | **Índice** | IPCA, IGP-M, INPC, Sem reajuste, Personalizado |
| **T** | **Reajuste manual (%)** | Percentual manual (prevalece sobre o índice) |
| **U** | **Reajuste aplicado (%)** | Cálculo automático ou fórmula herdada da linha anterior |
| **V** | **Impostos/encargos (%)** | Percentual de tributos e encargos aplicados |
| **W** | **Taxa de câmbio** | Câmbio automático (BRL: 1.0, USD: 5.3, EUR: 5.9) ou manual |
| **X** | **Valor base em BRL** | Calculado: `Valor por lançamento * Câmbio * (1 + Impostos)` |
| **Y** | **Contingência (%)** | Percentual de contingência/reserva orçamentária |
| **Z** | **Valor orçado por lançamento** | Calculado: `Valor base em BRL * (1 + Contingência)` |
| **AA** | **Conta contábil** | Ex: Suporte Técnico |
| **AB** | **Contrato/PO** | Número do PO, pedido ou contrato formal |
| **AC** | **Risco** | Baixo, Médio ou Alto |
| **AD** | **Descrição do risco/contingência** | Justificativa do risco ou plano de ação |
| **AE** | **Fonte/Memória de cálculo** | Justificativa + **Links dos arquivos e pasta no Google Drive** |
| **AF** | **Observações** | Anotações adicionais e notas de acompanhamento |

---

## 3. Gestão de Arquivos e Google Drive

* **Pasta Raiz Automática**: O sistema verifica e cria automaticamente no Google Drive a pasta **`Contratos - Anexos`**.
* **Organização por Contrato**: Para cada lançamento com arquivos anexados, é criada uma subpasta identificada pelo protocolo e fornecedor (Ex: `BRISA-CON-2026-0015 - FORNECEDOR`).
* **Arrastar e Soltar (Drag & Drop)**: Permite soltar múltiplos arquivos ou clicar para navegar.
* **Rastreabilidade**: Os links públicos e diretos para cada arquivo e para a pasta do Drive são gravados na coluna **Fonte/Memória de cálculo** da linha cadastrada.

---

## 4. Passo a Passo de Implantação no Google Sheets

### Passo 1: Abrir o Editor de Scripts
1. Acesse a planilha oficial: [Google Sheets - Contratos](https://docs.google.com/spreadsheets/d/1HUIi3NBEp4N-fJqByEKC_ZFRAqMi82sVk670ry0MZ6I/edit?gid=531593901#gid=531593901).
2. No menu superior da planilha, clique em **Extensões** > **Apps Script**.

### Passo 2: Inserir os Arquivos do Projeto
1. No painel esquerdo do Apps Script, selecione o arquivo existente `Código.gs` (ou `Code.gs`) e substitua todo o seu conteúdo pelo código do arquivo [`Code.gs`](file:///C:/Users/Usuário/.gemini/antigravity/scratch/sistema-gestao-contratos/Code.gs).
2. Clique no ícone de adição (**+**) ao lado de *Arquivos* e escolha **HTML**.
3. Nomeie o arquivo como **`Index`** (o Apps Script criará `Index.html`).
4. Cole todo o conteúdo do arquivo [`Index.html`](file:///C:/Users/Usuário/.gemini/antigravity/scratch/sistema-gestao-contratos/Index.html).
5. Clique no ícone de salvar (ou pressione `Ctrl + S`).

### Passo 3: Publicar como Web App
1. No canto superior direito do Apps Script, clique no botão azul **Implantar** > **Nova implantação**.
2. Clique no ícone de engrenagem ao lado de *Selecione o tipo* e escolha **App da Web**.
3. Preencha os campos:
   * **Descrição**: `Painel de Gestão de Contratos v1.0`
   * **Executar como**: `Eu (seu e-mail)`
   * **Quem pode acessar**: `Qualquer pessoa com uma Conta do Google` (ou `Qualquer pessoa dentro do seu domínio corporativo`).
4. Clique em **Implantar**.
5. Conceda as permissões de acesso solicitadas pelo Google (autorizando acesso ao Google Drive e Sheets).
6. Copie a **URL do App da Web** gerada. Esse link pode ser salvo nos favoritos ou compartilhado com a equipe.

### Passo 4: Menu Integrado na Planilha
* Ao recarregar a planilha no navegador, aparecerá automaticamente o menu superior **Gestão de Contratos**, contendo:
  * **Abrir Painel no Navegador (Web)**
  * **Abrir Formulário (Modal)**: Permite preencher o formulário em janela flutuante sem sair da planilha.
  * **Abrir Painel Lateral (Sidebar)**: Abre o formulário na lateral da planilha.
  * **Abrir Pasta de Anexos no Drive**: Acesso imediato à pasta dos documentos.

---

## 5. Recursos Adicionais e Novas Funcionalidades

1. **Inserção Obrigatória a partir da Linha 18**: O sistema respeita as linhas históricas 1 a 17 e começa o preenchimento de novos contratos a partir da linha 18 da aba `Cadastro Contratos`.
2. **Coluna de Notas Editável na Tabela**: Na página "Lista de Contratos", o campo de notas pode ser alterado diretamente na linha e salvo com o botão "Salvar", atualizando em tempo real a coluna 32 (AF) da planilha.
3. **Log de Alterações e Histórico Completo**: Todas as alterações de notas ou notificações geram registros automáticos na aba `Histórico de Alterações` da planilha (com data/hora, ID, protocolo, fornecedor, campo, valores anterior/novo e e-mail do usuário). O histórico é consultado e exibido diretamente no modal de detalhes do contrato.
4. **Envio de E-mail de Registro Corporativo**: Botão dedicado para disparar comunicados formais por e-mail para destinatários específicos (com atalhos rápidos para compras, controladoria, financeiro e jurídico), formatado no padrão corporativo a brisanet.
5. **Identidade Visual Oficial Brisanet**: Tipografia Figtree e Rubik, paleta de cores oficial (`#FF5022`, `#2242D4`, `#0B316D`, `#D0FF60`), grafia em minúsculas e estritamente **sem emojis**.
6. **Protocolo Automático Padronizado**: Exibição no formato corporativo `BRISA-CON-AAAA-XXXX` (ex: `BRISA-CON-2026-0015`).
7. **Preservação de Fórmulas**: Herda automaticamente as fórmulas de colunas calculadas (taxas, conversões e percentuais) da linha anterior.
8. **Filtros e Busca Instantânea**: Na aba *Lista de Contratos*, filtre por fornecedor, objeto, ID, status ou nível de risco em tempo real.

