# Manual do Usuario: Sistema de Gestao de Contratos
**Gerencia Executiva de Telefonia - Grupo Brisanet**

---

## 1. Apresentacao e Objetivos do Sistema

O **Sistema de Gestao de Contratos da Telefonia** e a plataforma corporativa oficial desenvolvida exclusivamente para atender as operacoes, a esteira de governanca e a gestao documental da **Gerencia Executiva de Telefonia** d'**a brisanet**.

### Principais Beneficios:
*   **Base Oficial Dedicada:** A Telefonia opera em uma nova base independente denominada `Base Oficial de Contratos - Gerência Executiva de Telefonia`, garantindo isolamento total contra alteracoes na planilha anterior.
*   **Fluxo Centrado no Fornecedor:** O parceiro e cadastrado primeiro e, dentro do seu painel, sao cadastrados e anexados todos os contratos pertencentes a ele.
*   **Estrutura por Gerencia no Google Drive:** A pasta raiz corporativa `Contratos - Gerência Executiva de Telefonia` e subdividida nas 5 gerencias que compoem a Telefonia, organizando fornecedores e contratos sob seus respectivos setores operacionais.
*   **Mascaras e Formatacao em Tempo Real:** Digitacao assistida automatica com formatacao de CNPJ (`00.000.000/0000-00`), Moeda (`R$ 0,00`), Porcentagem (`0,00%`) e Telefone (`(00) 00000-0000`).
*   **Reajuste por Base de Clientes:** Suporte dinamico a tabela de faixas de assinantes/clientes para contratos com modelo de tarifacao escalonada.
*   **Animacao de Carregamento:** Indicador visual de processamento em tempo real garantindo que o usuario acompanhe o status das requisicoes.
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
    *   **Razao Social:** Nome empresarial completo.
    *   **Nome Fantasia:** Nome operacional do fornecedor.
    *   **CNPJ:** Digite apenas os numeros; o sistema aplica a mascara `00.000.000/0000-00` automaticamente.
    *   **Segmento / Categoria:** Selecione a especialidade (Equipamentos de Telecom, Voz, Servicos de Rede, Infraestrutura, etc.).
    *   **Telefone de Contato:** Digite os numeros com DDD; a mascara `(00) 00000-0000` sera aplicada.
    *   **E-mail Corporativo e Nome do Ponto de Contato.**
3.  Clique no botao **Salvar Fornecedor**.
4.  O sistema cadastra o fornecedor, valida a chave e atualiza a visao geral.

### 3.2 Visualizar Fornecedores e Contratos (Painel Fornecedores & Contratos)
1.  Acesse a aba **Fornecedores & Contratos**.
2.  Visualize os cartoes de cada parceiro homologado:
    *   Razao Social, CNPJ formatado e status de homologacao.
    *   Total de contratos vinculados e desembolso mensal consolidado.
    *   Botao de link direto para a pasta do fornecedor no Drive.
3.  **Para expandir os contratos:** Clique sobre o cabecalho do cartao do fornecedor. A lista de contratos vinculados se abrira em formato de tabela detalhada.
4.  Utilize o campo de busca superior para localizar parceiros por razao social, CNPJ ou servicos prestados.

### 3.3 Adicionar Contrato a um Fornecedor Existente
1.  No cartao do fornecedor desejado, clique no botao **+ Novo Contrato** (ou no botao "+ Adicionar Contrato" dentro da tabela expandida).
2.  O modal de cadastro de contrato sera aberto com os dados do fornecedor ja associados.
3.  **Setor da Gerencia Executiva de Telefonia (Obrigatorio):**
    *   Selecione a qual das 5 gerencias o contrato pertence:
        *   `GESTAO TELEFONIA`
        *   `OPERACAO E MANUTENCAO DE REDES`
        *   `OPERACOES DE REDES`
        *   `PROJETOS DE IMPLANTACAO`
        *   `TELEFONIA`
4.  **Dados do Contrato e Vigencia:**
    *   Informe o Objeto Resumido do Contrato.
    *   Selecione a Modalidade e a Data de Inicio da Vigencia.
    *   Caso a contratacao nao tenha prazo de encerramento determinado, marque **Vigencia Indeterminada** (o campo de data final sera desabilitado).
5.  **Financeiro e Indice de Reajuste:**
    *   Preencha o Valor Mensal (o sistema formata em `R$ 0,00` automaticamente).
    *   No campo **Criterio / Indice de Reajuste**, selecione o indice (ex: `IPCA`, `IGP-M`, `INPC`, `Fixo / Sem Reajuste` ou `Base de Clientes`).
    *   **Quando selecionado "Base de Clientes":** O sistema exibe a **Tabela de Faixas por Base de Clientes**. Preencha as faixas de assinantes (ex: 0 a 50.000, 50.001 a 100.000), o valor acordado e a descricao da faixa. Clique em **+ Adicionar Faixa** para novas linhas.
    *   Preencha o Mes de Reajuste, Centro de Custo e E-mail do Gestor Tecnico.
6.  **Upload do Arquivo Contratual:**
    *   Arraste e solte ou selecione o arquivo do contrato (PDF, PNG, JPEG, DOCX, XLSX).
7.  Clique no botao **Salvar Contrato**.
8.  **Automacoes executadas pelo sistema:**
    *   Gera o codigo oficial do contrato (`BRISA-TEL-{ANO}-{ID}`).
    *   Cria/identifica a pasta da gerencia selecionada no Google Drive.
    *   Cria a pasta do fornecedor dentro da gerencia respectiva.
    *   Cria a pasta oficial do contrato com as 5 subpastas padronizadas (`01_Contrato_Principal`, `02_Termos_Aditivos`, `03_Documentos_Tecnicos`, `04_Boletins_Medicao`, `05_Aprovacoes_e_Pareceres`).
    *   Faz o upload do arquivo para a subpasta `01_Contrato_Principal`.
    *   Registra a criacao na Trilha Oficial de Auditoria.

### 3.4 Utilizar a Ficha 360° do Contrato
Na lista de contratos vinculados ao fornecedor, clique no botao **Ficha 360°**:
*   **Aba Resumo & Cadastro:** Visao completa dos dados gerais, partes, setor/gerencia responsavel e vigencia.
*   **Aba Financeiro & Reajustes:** Consulta do valor mensal, criterio/indice acordado e, quando aplicavel, a tabela detalhada de faixas por base de clientes.
*   **Aba Documentos no Drive:** Links de acesso direto as 5 subpastas oficiais no Google Drive.
*   **Aba Termos Aditivos:** Historico de aditamentos de valor e prazo.
*   **Aba Auditoria & Certificado:** Historico cronologico de movimentacoes e botao de emissao do certificado com hash de autenticidade.

### 3.5 Submeter Contrato para Aprovacao Formal
1.  Na Ficha 360° do contrato, clique em **Submeter para Aprovacao**.
2.  Selecione a alcada correspondente:
    *   `Coordenador`: Aprovacao tecnica de escopo e volumetria.
    *   `Gerente`: Validacao de orcamento e alcada tatica.
    *   `Gerente Executivo`: Contratos de grande porte ou decisoes estrategicas.
3.  Informe o e-mail institucional do aprovador e redija a **Justificativa Operacional / Parecer Tecnico**.
4.  Clique em **Enviar para Aprovacao**. O status mudara para `Aguardando Aprovacao` e o aprovador recebera a notificacao por e-mail.

### 3.6 Emitir o Certificado Oficial de Auditoria
1.  Na Ficha 360° do contrato, acesse a aba **Auditoria & Certificado**.
2.  Clique em **Gerar Certificado de Auditoria**.
3.  O sistema gerara a folha oficial com:
    *   Identificacao institucional d'**a brisanet**.
    *   Dados contratuais, setor da telefonia e valores vigentes.
    *   Cronologia completa e imutavel de todas as decisoes tomadas.
    *   Assinatura digital com hash de autenticidade no padrao `BRISA-AUDIT-...`.
4.  Clique em **Imprimir / Salvar PDF** para arquivamento ou anexacao formal.

---

## 4. Guia Passo a Passo: Aprovadores (Coordenador, Gerente e Gerente Executivo)

Os aprovadores exercem papel decisorio na governanca dos contratos da Telefonia, avaliando conformidade tecnica e orcamentaria.

### 4.1 Recebimento da Solicitacao
*   Ao ser indicado em uma esteira de aprovacao, voce recebera um e-mail com o assunto:
    `[brisanet] Solicitacao de Aprovacao de Contrato - {Alcada} (CT #{ID})`.
*   O e-mail contem o resumo do objeto, gerencia da telefonia, valor mensal, solicitante e o link de acesso rapido.

### 4.2 Decisao na Central de Aprovacoes
1.  Acesse o sistema e clique na aba **Central de Aprovacoes**.
2.  Localize a solicitacao atribuida a sua alcada.
3.  Analise os dados do contrato, a justificativa do solicitante e consulte a pasta de documentos no Drive se necessario.
4.  **Para Aprovar:**
    *   Clique no botao verde **Aprovar**.
    *   Confirme o registro da aprovacao formal. Sua decisao sera autenticada digitalmente e o solicitante sera informado.
5.  **Para Solicitar Ajustes (Devolver):**
    *   Clique no botao terracota **Solicitar Ajustes**.
    *   No modal que se abrira, preencha o campo **Parecer Oficial / Apontamentos** descrevendo de forma detalhada o que precisa ser corrigido ou complementado.
    *   Clique em **Confirmar Registro**. O contrato retornara imediatamente a Gestao Telefonia com o status `Devolvido para Ajustes`.

---

## 5. Estrutura Padrao no Google Drive

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

## 6. Boas Praticas e Padroes da Marca

*   **Identidade da Marca:** Refira-se sempre no feminino: **a brisanet**. A grafia da marca e sempre em caixa baixa (**brisanet** ou **brisa**).
*   **Comunicacao Direta:** Textos curtos, objetivos e fundamentados, focados em conformidade tecnica e eficiencia operacional.
*   **Zero Emojis:** E terminantemente proibida a utilizacao de emojis em titulos, despachos, relatorios, botoes, telas ou pareceres contratuais.
*   **Suporte e Duvidas:** Entre em contato com a equipe da **Gestao Telefonia** pelo e-mail institucional corporativo.
