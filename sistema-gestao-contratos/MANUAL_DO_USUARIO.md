# Manual do Usuario: Sistema de Gestao de Contratos
**Gerencia Executiva de Telefonia - Grupo Brisanet**

---

## 1. Apresentacao e Objetivos do Sistema

O **Sistema de Gestao de Contratos da Telefonia** e a plataforma corporativa oficial desenvolvida exclusivamente para atender as operacoes, a esteira de governanca e a gestao documental da **Gerencia Executiva de Telefonia** d'**a brisanet**.

### Principais Beneficios:
*   **Base Oficial Dedicada:** A Telefonia opera em uma nova base independente denominada `Base Oficial de Contratos - Gerência Executiva de Telefonia`, garantindo isolamento total contra alteracoes na planilha anterior.
*   **Fluxo Centrado no Fornecedor:** O parceiro e cadastrado primeiro e, dentro do seu painel, sao cadastrados e anexados todos os contratos pertencentes a ele.
*   **Identificacao por Apelido:** Suporte ao campo "Apelido" no cadastro de fornecedores para facilitar o reconhecimento rapido da empresa conforme conhecida pelos colaboradores.
*   **Formulario Completo de Contrato (29 Campos Oficiais):** Estruturacao minuciosa cobrindo setor da Telefonia, centro de custo, conta contabil, contrato/PO, vigencia, periodicidade, 1a competencia, moeda, cambio, orcamento por lancamento, tributos, contingencia, reajuste, riscos e memoria de calculo.
*   **Estrutura por Gerencia no Google Drive:** A pasta raiz corporativa `Contratos - Gerência Executiva de Telefonia` e subdividida nas 5 gerencias que compoem a Telefonia, organizando fornecedores e contratos sob seus respectivos setores operacionais.
*   **Mascaras e Formatacao em Tempo Real:** Digitacao assistida automatica com formatacao de CNPJ (`00.000.000/0000-00`), Moeda (`R$ 0,00`), Porcentagem (`0,00%`), Data (`DD/MM/AAAA`), Telefone (`(00) 00000-0000`) e Taxa de Cambio (`1,0000`).
*   **Reajuste por Base de Clientes:** Suporte dinamico a tabela de faixas de assinantes/clientes para contratos com modelo de tarifacao escalonada.
*   **Animacao de Carregamento & Rolagem Lateral:** Indicador visual de processamento em tempo real e janela de novo contrato com rolagem lateral fluida e botoes fixados.
*   **Esteira Formal de Alcadas de Aprovacao:** Fluxo integrado para validacoes formais de Coordenadores, Gerentes e Gerente Executivo.
*   **Trilha Oficial de Auditoria Imutavel:** Registro cronologico a prova de adulteracao com data/hora no Horario de Brasilia (UTC-3), e-mail corporativo, acao, valores antes/depois e pareceres.
*   **Certificado Oficial de Conformidade:** Emissao de folha de rosto com assinatura digital em hash para anexacao comprovatoria.

---

## 2. Acesso ao Sistema

O sistema pode ser acessado por dois canais oficiais:

1.  **Acesso Direto via WebApp (Navegador):**
    *   Utilize o link corporativo da aplicacao web disponibilizado pela equipe de TI/Gestao Telefonia.
    *   Certifique-se de estar conectado com sua conta corporativa do Google Workspace (`@grupobrisanet.com.br`).
2.  **Acesso Integrado via Google Sheets:**
    *   Abra a Planilha Oficial de Contratos.
    *   No menu superior, clique em **Gestao Telefonia** -> **Abrir Painel Corporativo**.

---

## 3. Guia Passo a Passo: Setor Administrativo (Gestao Telefonia)

O setor **Gestao Telefonia** atua como operador mestre do sistema, responsavel pelo cadastro de fornecedores, inclusao e aditamento de contratos, classificacao documental, submissao de aprovacoes e controle de prazos.

### 3.1 Cadastrar um Novo Fornecedor
1.  Na barra de navegacao superior, clique na aba **Novo Fornecedor**.
2.  Preencha os campos obrigatorios:
    *   **Razao Social:** Nome empresarial completo registrado na Receita Federal.
    *   **Nome Fantasia:** Nome de fachada da empresa parceira.
    *   **Apelido (Nome Usual):** Nome mais conhecido da empresa pelos colaboradores da Telefonia (ex: Huawei, Embratel, Cirion, Vogel, American Tower).
    *   **CNPJ:** Digite apenas os numeros; o sistema aplica a mascara `00.000.000/0000-00` automaticamente.
    *   **Telefone Comercial:** Digite os numeros com DDD; a mascara `(00) 00000-0000` sera aplicada.
    *   **E-mail Comercial:** Endereco corporativo de contato.
    *   **Status de Homologacao:** Selecione `Ativo` ou `Em Homologacao`.
    *   **Observacoes Internas:** Informacoes relevantes sobre o parceiro.
3.  Clique no botao **Salvar Fornecedor**.
4.  O sistema cadastra o parceiro na base relacional e o disponibiliza para anexacao de contratos.

### 3.2 Visualizar Fornecedores e Contratos (Painel Fornecedores & Contratos)
1.  Acesse a aba **Fornecedores & Contratos**.
2.  Visualize os cartoes de cada parceiro homologado:
    *   Razao Social em destaque acompanhada do **Apelido** entre parenteses.
    *   CNPJ formatado, nome fantasia e status.
    *   Total de contratos vinculados e desembolso mensal consolidado.
    *   Botao de link direto para a pasta do fornecedor no Drive.
3.  **Para expandir os contratos:** Clique sobre o cabecalho do cartao do fornecedor. A lista de contratos vinculados se abrira em formato de tabela detalhada.
4.  Utilize o campo de busca superior para localizar parceiros por razao social, nome fantasia, apelido, CNPJ ou numero de contrato/PO.

### 3.3 Adicionar Contrato a um Fornecedor Existente
1.  No cartao do fornecedor desejado, clique no botao **+ Novo Contrato**.
2.  A janela modal de cadastro se abrira com os dados do fornecedor e CNPJ ja pre-preenchidos. A janela conta com rolagem lateral propria e botoes fixados no rodape.
3.  Preencha as 6 secoes do formulario:

#### Secao 1: Setor Responsavel, Identificacao & Objeto
*   **Setor / Gerencia da Telefonia:** Selecione obrigatoriamente a qual das 5 gerencias pertence:
    *   `TELEFONIA`
    *   `GESTAO TELEFONIA`
    *   `OPERACAO E MANUTENCAO DE REDES`
    *   `OPERACOES DE REDES`
    *   `PROJETOS DE IMPLANTACAO`
*   **Tipo de Contrato:** Voz / Telefonia, Dados / Links Dedicados, Torres e Compartilhamento, Infraestrutura e Redes, Licenciamento de Software, Manutencao Operacional, Servicos Tecnicos ou Outros.
*   **CNPJ:** Pre-preenchido com o CNPJ do fornecedor (com formatacao automatica).
*   **Contrato / PO:** Codigo de contrato ou pedido de compra (ex: CT-2026-4412 / PO-9821).
*   **Centro de Custo:** Codigo do centro de custo responsavel (ex: 104010).
*   **Objeto do Contrato:** Descricao sucinta e precisa do escopo, circuitos ou servicos prestados.

#### Secao 2: Vigencia, Prazos & Periodicidade
*   **Inicio da Vigencia:** Data de inicio da operacao.
*   **Termino da Vigencia & Vigencia Indeterminada:** Data final da vigencia. Caso o contrato nao possua termino previsto, marque **Vigencia Indeterminada** (o campo de data final sera desabilitado).
*   **Aviso Previo (Dias):** Prazo em dias para comunicacao de rescisao (padrao: 30 dias).
*   **Renovacao Automatica:** Indique se o contrato possui renovacao automatica (`Sim` ou `Nao`).
*   **Periodicidade:** Mensal, Bimestral, Trimestral, Semestral, Anual ou Unico.
*   **1ª Competencia (DD/MM/AAAA):** Data da primeira competencia de faturamento com mascara assistida.

#### Secao 3: Valores Financeiros, Moeda & Orcamento
*   **Moeda:** BRL - Real, USD - Dolar Americano, EUR - Euro ou Outra.
*   **Taxa de Cambio:** Valor da cotacao (padrao: 1,0000 para BRL). Ao selecionar moeda estrangeira, o campo e liberado para digitacao.
*   **Valor Mensal (R$):** Valor mensal em moeda com formatacao em tempo real.
*   **Valor Base em BRL:** Calculado automaticamente a partir do Valor Mensal multiplicado pela Taxa de Cambio.
*   **Valor Orcado por Lancamento:** Valor planejado na rubrica orcamentaria.
*   **Impostos / Encargos (%):** Percentual estimado de tributacao com formatacao automatica (`0,00%`).
*   **Contingencia (%):** Percentual de margem para variacoes operacionais.
*   **Conta Contabil:** Codigo contabil do plano de contas (ex: 4.1.1.01.002).

#### Secao 4: Regras de Reajuste & Base de Clientes
*   **Criterio / Indice de Reajuste:** IPCA, IGP-M, INPC, Fixo / Sem Reajuste, Base de Clientes ou Personalizado.
*   **Data do Reajuste & Caixa "Sem Reajuste":** Data prevista para aplicacao do reajuste. Caso o contrato seja fixo, marque **Sem Reajuste** (o campo de data e desabilitado).
*   **Mes Aniversario (1 a 12):** Mes de vigencia em que incide o aniversario contratual.
*   **Reajuste Aplicado (%):** Percentual de reajuste averbado na competencia.
*   **Tabela de Valores por Base de Clientes:** Exibida dinamicamente quando selecionado o criterio "Base de Clientes". Permite preencher as faixas de clientes (Faixa De, Faixa Ate, Valor R$/Cliente e Descricao) e adicionar novas linhas pelo botao **+ Adicionar Faixa**.

#### Secao 5: Governanca, Risco & Memoria de Calculo
*   **Risco:** Classificacao do nivel de risco (`Baixo`, `Medio`, `Alto`).
*   **Descricao do Risco / Contingencia:** Detalhamento dos fatores de risco operacional ou regras de contingencia.
*   **Fonte / Memoria de Calculo:** Metodologia de apuracao, volumetria estimada ou premissas aplicadas.
*   **Observacoes:** Anotacoes complementares e particularidades tecnicas.

#### Secao 6: Arquivos do Contrato (Upload no Drive)
*   Arraste e solte ou clique para selecionar os documentos do contrato (PDF, PNG, JPG, JPEG, DOCX, XLSX, ZIP).
*   Os arquivos serao arquivados diretamente na subpasta oficial `01_Contrato_Principal`.

4.  Clique no botao **Salvar Contrato** no rodape fixado.
5.  O sistema gera o protocolo sequencial oficial (`BRISA-TEL-{ANO}-{ID}`), cria as pastas no Google Drive sob a gerencia indicada, faz o upload dos arquivos e grava o registro na base e na trilha de auditoria.

### 3.4 Utilizar a Ficha 360° do Contrato
Na lista de contratos vinculados ao parceiro, clique no botao **Ficha 360°**:
*   **Aba Resumo & Cadastro:** Visao completa dos dados gerais, gerencia setorial, contrato/PO, CNPJ, vigencia, aviso previo, renovacao automatica, periodicidade e conta contabil.
*   **Aba Financeiro & Reajustes:** Consulta do valor mensal, moeda, cambio, valor base BRL, valor orcado, impostos, contingencia, criterio de reajuste, data de reajuste, nivel de risco, descricao de contingencia, memoria de calculo e tabela de faixas por base de clientes.
*   **Aba Documentos no Drive:** Acesso direto as 5 subpastas oficiais no Google Drive e upload de documentos complementares.
*   **Aba Termos Aditivos:** Historico de aditamentos de valor e prazo.
*   **Aba Auditoria & Certificado:** Historico cronologico de movimentacoes e botao de emissao do certificado com hash de autenticidade.

---

## 4. Estrutura Padrao no Google Drive

Toda a documentacao e organizada estritamente dentro da estrutura padronizada criada pelo sistema:

```
[DRIVE] Contratos - Gerência Executiva de Telefonia/
│
├── 00_Configuracoes_e_Modelos/
│
├── GESTAO TELEFONIA/
├── OPERACAO E MANUTENCAO DE REDES/
├── OPERACOES DE REDES/
├── PROJETOS DE IMPLANTACAO/
└── TELEFONIA/
    │
    └── {NOME_FORNECEDOR}/
        └── CT-{ANO}-{ID} - {Objeto}/
            ├── 01_Contrato_Principal/          -> Minutas e instrumento assinado
            ├── 02_Termos_Aditivos/             -> Termos aditivos averbados
            ├── 03_Documentos_Tecnicos/         -> Propostas comerciais, SLAs e topologias
            ├── 04_Boletins_Medicao/            -> Relatorios e atestes de servicos
            └── 05_Aprovacoes_e_Pareceres/      -> Evidencias de e-mails e despachos
```

---

## 5. Boas Praticas e Padroes da Marca

*   **Identidade da Marca:** Refira-se sempre no feminino: **a brisanet**. A grafia da marca e sempre em caixa baixa (**brisanet** ou **brisa**).
*   **Comunicacao Direta:** Textos curtos, objetivos e fundamentados, focados em conformidade tecnica e eficiencia operacional.
*   **Zero Emojis:** E terminantemente proibida a utilizacao de emojis em titulos, despachos, relatorios, botoes, telas ou pareceres contratuais.
*   **Suporte e Duvidas:** Entre em contato com a equipe da **Gestao Telefonia** pelo e-mail institucional corporativo.
