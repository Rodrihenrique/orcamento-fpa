# Manual do Usuário - Painel de Contratos | Gestão Telefonia
**Gerência Executiva de Telefonia · brisanet**

---

## 1. Visão Geral do Sistema
O Painel de Contratos da Gerência Executiva de Telefonia da brisanet foi concebido para centralizar a governança operacional, financeira, documental e de auditoria dos contratos de telecomunicações.

O sistema opera no modelo relacional fornecedor-contrato, no qual cada fornecedor corporativo agrupa seus respectivos contratos organizados por setor da telefonia e espelhados em pastas dedicadas no Google Drive corporativo, com controle estrito de acessos por gerência, designação de substitutos temporários durante ausência de gestores e monitoramento pró-ativo de reajustes periódicos.

---

## 2. Acesso, Interface e Perfis de Acesso

### 2.1 Identidade Visual e Layout
A interface segue rigorosamente a identidade visual da brisanet, estruturada com a paleta oficial (#FF5022, #2242D4, #0B316D, #D0FF60, #E47D20, #9F4016, #DA2468, #E8E8E8), tipografia Figtree e ausência de emojis.

A tela principal é composta por:
1. **Cabeçalho Institucional:** Identificação do sistema, badge de e-mail do usuário logado, papel, setor permitido com indicador de acesso (Acesso Total ou Acesso Restrito), badge de substituto ativo (quando aplicável), botão de designação de substituto temporário e links diretos para a Planilha Oficial e para o Google Drive da Telefonia.
2. **Banner de Alertas de Reajuste Periódico:** Notificação visual destacada em laranja (#FF5022) exibindo contratos com previsão de reajuste periódico nos próximos 5 dias.
3. **Painel de Indicadores (KPIs):** Fornecedores Homologados, Contratos Ativos, Desembolso Mensal, Orçamento Anual (12m), Vencimento em até 60 dias e Aprovações Pendentes (calculados com base no escopo permitido ao usuário).
4. **Navegação por Abas:**
   - **Fornecedores & Contratos:** Visão consolidada em acordeão (drill-down).
   - **Novo Fornecedor:** Cadastro de novos parceiros comerciais com definição de pasta setorial.
   - **Central de Aprovações:** Governança formal de alterações, renovações, reajustes não programados e migração de faixas.
   - **Log de Alterações:** Acompanhamento, governança e monitoramento de todas as alterações com filtros por Gerência, Fornecedor e Contrato.

---

## 3. Controle de Acessos por Gerência & Substituição Temporária

### 3.1 Níveis de Acesso por Setor
A aba `Acessos_Alcadas` da planilha oficial controla a visibilidade e permissões de cada gestor:
- **Gestão Telefonia (Administrativo):** Possui acesso completo e irrestrito a todos os contratos, fornecedores e setores da Telefonia.
- **Telefonia:** Acesso restrito aos contratos vinculados ao setor *Telefonia*.
- **Operação e Manutenção de Redes:** Acesso restrito aos contratos vinculados ao setor *Operação e Manutenção de Redes*.
- **Operações de Redes:** Acesso restrito aos contratos vinculados ao setor *Operações de Redes*.
- **Projetos de Implantação:** Acesso restrito aos contratos vinculados ao setor *Projetos de Implantação*.

Os gestores com acesso setorial visualizam apenas os contratos e KPIs pertencentes à sua respectiva gerência, garantindo sigilo e foco operacional.

### 3.2 Designação de Substituto Temporário durante Ausência
Quando o gestor ou gerente responsável por aprovações e gestão de contratos for se ausentar (férias, licença, viagem a serviço), ele pode designar formalmente um substituto temporário:
1. No cabeçalho superior do sistema, clique em **Definir Substituto**.
2. No modal de configuração:
   - Digite o e-mail do colaborador substituto (`substituto@grupobrisanet.com.br`).
   - Defina o período de ausência:
     - **Período Determinado:** Informe a data de início e a data de término da substituição.
     - **Período Indeterminado:** Marque a caixa de seleção *Período de Ausência Indeterminado* (a substituição ficará ativa até ser revogada manualmente).
3. Clique em **Salvar Substituto**.
4. O sistema grava a delegação na aba `Acessos_Alcadas` e registra o evento na trilha de auditoria.
5. Durante o período ativo, o substituto logado no sistema herdará o setor e as permissões de alçada do titular, exibindo no cabeçalho o aviso: `Substituto de: {email do titular}`.
6. A substituição pode ser revogada a qualquer instante pelo titular clicando em **Definir Substituto** e selecionando **Revogar Substituição**.

---

## 4. Alertas de Reajuste Periódico de Valor (Próximos 5 Dias)

### 4.1 Funcionamento dos Alertas
Para contratos com critério de reajuste periódico definido (Mensal, Bimestral, Trimestral, Semestral, Anual), o sistema projeta dinamicamente a próxima data de reajuste a partir da data de reajuste cadastrada, da 1ª competência ou da data de início de vigência.

Quando faltarem 5 dias ou menos para a data prevista de reajuste:
1. O sistema compila o contrato na lista de alertas prioritários.
2. Exibe no topo do painel o **Banner de Alertas de Reajuste Periódico de Valor (Próximos 5 Dias)**.
3. Notifica o gestor responsável pelo contrato (cujo e-mail foi gravado no cadastro) e a equipe da **Gestão Telefonia (Administrativo)** para revisão ou repactuação do valor antes da data prevista.
4. Cada cartão de alerta permite acionar diretamente a **Ficha 360°** do contrato para análise financeira ou abertura de solicitação de repactuação.

---

## 5. Gestão de Fornecedores

### 5.1 Título Principal por Apelido e Perfil Formal
Na lista de fornecedores, o título principal em destaque é sempre o **Apelido (Nome Usual)** da empresa (ex: *Huawei*, *Cirion*, *Vogel*, *American Tower*), facilitando a identificação imediata pelos colaboradores da telefonia.

Ao expandir o fornecedor, o painel exibe o **Perfil Formal do Fornecedor**, contendo:
- Razão Social completa;
- Nome Fantasia;
- CNPJ formatado;
- Contato Comercial e E-mail Comercial;
- Link direto para a pasta exclusiva do fornecedor no Google Drive dentro da gerência correspondente.

### 5.2 Cadastro de Novo Fornecedor
Para cadastrar um fornecedor:
1. Acesse a aba **Novo Fornecedor**.
2. Preencha os campos obrigatórios:
   - **Razão Social:** Razão formal registrada na Receita Federal.
   - **Nome Fantasia:** Nome de mercado.
   - **Apelido (Nome Usual):** Nome mais conhecido internamente na telefonia (utilizado como título principal na tela).
   - **Setor / Gerência da Telefonia:** Seleção entre as 5 gerências (*GESTAO TELEFONIA*, *OPERACAO E MANUTENCAO DE REDES*, *OPERACOES DE REDES*, *PROJETOS DE IMPLANTACAO*, *TELEFONIA*), definindo em qual pasta setorial do Google Drive a pasta deste fornecedor será provisionada.
   - **CNPJ:** Máscara automática (00.000.000/0000-00).
   - **Telefone Comercial e E-mail Comercial:** Canais para notificações.
   - **Status de Homologação:** Ativo ou Em Homologação.
   - **Observações Internas:** Notas operacionais.
3. Clique em **Salvar Fornecedor**.
4. O fornecedor já nasce validado e ativo, com sua pasta provisionada dentro do setor escolhido no Drive, pronto para receber seus contratos.

---

## 6. Cadastro de Novo Contrato

### 6.1 Abertura do Formulário
Dentro do cartão do fornecedor correspondente, clique em **+ Novo Contrato** ou **+ Adicionar Contrato a este Fornecedor**. O formulário abre em janela modal com cantos arredondados preservados, rolagem interna suave e botões de ação fixos na base.

### 6.2 Campos Obrigatórios e Estrutura dos 29 Atributos
O cadastro contempla 6 blocos organizados:

1. **Setor Responsável, Identificação & Objeto:**
   - **Setor / Gerência da Telefonia:** Seleção obrigatória entre as 5 gerências. O contrato é automaticamente arquivado na pasta desta gerência no Google Drive.
   - **Tipo de Contrato:** Suporte Técnico, Assessoria e Consultoria Empresarial, Serviços de Terceiros, Interconexão ou personalização via "+ Adicionar outro tipo...".
   - **CNPJ:** Preenchido e validado com máscara automática.
   - **E-mail do Responsável pelo Contrato:** E-mail do gestor técnico/operacional responsável pelo acompanhamento deste contrato e destinatário de futuros alertas automáticos de reajuste.
   - **Contrato / PO:** Número formal do contrato ou pedido de compra.
   - **Centro de Custo:** Código de centro de custo da telefonia.
   - **Objeto do Contrato:** Descrição sucinta do escopo contratado.

2. **Vigência, Prazos & Periodicidade:**
   - **Início da Vigência:** Formato DD/MM/AAAA.
   - **Término da Vigência:** Formato DD/MM/AAAA.
   - **Vigência Indeterminada:** Ao marcar, o campo de término é limpo e desabilitado.
   - **Aviso Prévio (Dias):** Padrão de 30 dias para notificações de rescisão.
   - **Renovação Automática:** Sim ou Não.
   - **Periodicidade:** Mensal, Bimestral, Trimestral, Semestral, Anual ou Único.
   - **1ª Competência:** Data de referência inicial.

3. **Valores Financeiros, Moeda & Orçamento:**
   - **Moeda:** BRL, USD, EUR ou Outra.
   - **Taxa de Câmbio:** Cotação para conversão cambial.
   - **Valor Mensal:** Valor financeiro periódico sem moeda pré-fixada, formatado dinamicamente de acordo com a moeda selecionada (BRL, USD, EUR, etc.).
   - **Valor Base em BRL:** Cálculo automático sincronizado (Valor Mensal x Câmbio).
   - **Valor Orçado por Lançamento:** Previsão contábil do orçamento.
   - **Impostos / Encargos (%):** Percentual retido ou incidente.
   - **Contingência (%):** Margem de segurança orçamentária.
   - **Conta Contábil:** Classificação no plano de contas.

4. **Regras de Reajuste & Base de Clientes:**
   - **Critério / Índice de Reajuste:** IPCA, IGP-M, INPC, Fixo/Sem Reajuste, Base de Clientes ou Personalizado.
   - **Caixa de Seleção "Sem Reajuste":** Desabilita campos de reajuste quando aplicável.
   - **Data do Reajuste & Mês Aniversário:** Ciclo de aplicação do índice.
   - **Reajuste Aplicado (%):** Percentual praticado.
   - **Tabela de Faixas por Base de Clientes (com Seleção de Faixa Atual):**
     Ao selecionar "Base de Clientes", uma tabela dinâmica permite adicionar faixas de assinantes. Na frente de cada faixa, há um botão de seleção ("bolinha" / radio button) para indicar em qual faixa o contrato se encontra atualmente, sincronizando o valor a faturar.

5. **Governança, Risco & Memória de Cálculo:**
   - **Risco:** Classificação formal (Baixo, Médio ou Alto).
   - **Descrição do Risco / Contingência:** Análise de impacto e mitigação.
   - **Fonte / Memória de Cálculo:** Referência técnica adotada.
   - **Observações Gerais:** Informações complementares.

6. **Anexar Arquivo Oficial do Contrato:**
   - Upload de documentos (PDF, PNG, JPG, JPEG, DOCX, XLSX).
   - O arquivo é transmitido e arquivado diretamente na subpasta oficial `01_Contrato_Principal` dentro do Google Drive da gerência selecionada.

---

## 7. Ficha 360° do Contrato & Controle de Logs Individual

Ao clicar em **Abrir Ficha 360°** em qualquer contrato, o modal executivo apresenta quatro abas temáticas:
1. **Resumo & Cadastro:** Dados cadastrais, objeto, prazos, e-mail do gestor responsável e datas formatadas.
2. **Financeiro & Reajustes:** Desembolso, moeda, reajustes e tabela de faixas de base de clientes com indicação destacada da faixa vigente.
3. **Documentos no Drive:** Link direto para a pasta do contrato e interface de upload adicional para a subpasta `01_Contrato_Principal`.
4. **Log de Alterações (Individual do Contrato):**
   - Exibe a cronologia completa e imutável de todas as modificações realizadas especificamente naquele contrato.
   - Detalha data e horário (DD/MM/AAAA - HH:MM:SS), e-mail do responsável, papel/alçada, ação realizada, campo afetado, valor anterior versus novo valor e justificativa operacional ou parecer de aprovação.

---

## 8. Central de Aprovações & Governança de Mudanças

### 8.1 Diretriz Operacional
Todos os fornecedores e contratos cadastrados no sistema já nascem aprovados e ativos, pois sua formalização prévia foi verificada antes da inclusão no sistema.

A **Central de Aprovações** é utilizada para governança de **Mudanças Contratuais**:
- Alterações contratuais e de escopo;
- Renovações de vigência (aditivos de prazo);
- Reajustes não programados ou extraordinários;
- Migração de faixas de faturamento por base de clientes.

### 8.2 Fluxo de Solicitação e Decisão Formal
1. O gestor abre a solicitação através do botão **+ Nova Solicitação de Alteração** ou na Ficha 360° do contrato (**Solicitar Alteração / Aprovação**).
2. Informa o contrato alvo, o tipo de mudança, o detalhamento da proposta, a alçada requerida (Coordenador, Gerente ou Gerente Executivo), o e-mail do responsável e a justificativa técnica.
3. O status do contrato passa para `Em Alteração (Aguardando Aprovação)`.
4. O responsável notificado acessa a Central de Aprovações, avalia o memorial e registra sua decisão:
   - **Aprovar:** O contrato retorna ao status `Vigente`, e a decisão é gravada com carimbo cronológico oficial.
   - **Solicitar Ajustes:** O parecer descreve os apontamentos necessários para correções.
5. Toda decisão gera registro imutável no Log de Alterações e notificação aos envolvidos.

---

## 9. Aba Log de Alterações (Geral)

A aba **Log de Alterações** transforma a governança do sistema em uma central ativa de acompanhamento e monitoramento de alterações contratuais:
- **Filtros Multidimensionais:**
  - **Filtro por Gerência:** Permite selecionar qualquer uma das gerências da Telefonia.
  - **Filtro por Fornecedor:** Dropdown dinâmico com todos os fornecedores da base.
  - **Filtro por Contrato:** Dropdown dinâmico com todos os protocolos de contratos cadastrados.
  - **Busca Textual em Tempo Real:** Pesquisa rápida por protocolo, fornecedor, responsável, ação ou justificativa.
  - **Limpar Filtros:** Restaura a visualização padrão com um clique.
- **Tabela Estruturada em 10 Colunas:**
  1. Protocolo / ID do Log
  2. Data e Horário (DD/MM/AAAA - HH:MM:SS)
  3. Responsável (E-mail corporativo)
  4. Papel / Alçada
  5. Gerência / Setor
  6. Fornecedor
  7. Ação Realizada (Badge colorida)
  8. Campo Afetado
  9. Antes versus Depois (Destaque visual de transição de valores)
  10. Justificativa / Parecer Formal

---

## 10. Estrutura de Pastas no Google Drive e Planilha Oficial

### 10.1 Estrutura do Google Drive
A pasta raiz `Contratos - Gerência Executiva de Telefonia` contém exclusivamente as 5 pastas dos setores da Telefonia:
- `GESTAO TELEFONIA`
- `OPERACAO E MANUTENCAO DE REDES`
- `OPERACOES DE REDES`
- `PROJETOS DE IMPLANTACAO`
- `TELEFONIA`

Cada fornecedor e seus respectivos contratos são organizados dentro da gerência correspondente selecionada:
`[SETOR] / [Fornecedor] / CT-{ANO}-{ID} - {Objeto} / 01_Contrato_Principal`

### 10.2 Linha de Cabeçalho Oficial da Aba Contratos (45 Colunas)
1. `ID do Contrato`
2. `Protocolo Oficial`
3. `ID do Fornecedor`
4. `Fornecedor / Razão Social`
5. `Objeto do Contrato`
6. `Tipo de Contrato`
7. `Situação do Contrato`
8. `Status de Aprovação`
9. `Início da Vigência`
10. `Término da Vigência`
11. `Vigência Indeterminada`
12. `Aviso Prévio (Dias)`
13. `Valor Mensal Base`
14. `Valor Mensal Atual`
15. `Variação Mês a Mês (Valor)`
16. `Variação Mês a Mês (%)`
17. `Critério / Índice de Reajuste`
18. `Mês Aniversário (1 a 12)`
19. `Centro de Custo`
20. `Conta Contábil`
21. `Gestor Técnico / Responsável (E-mail)`
22. `ID Pasta Contrato (Drive)`
23. `ID Pasta Fornecedor (Drive)`
24. `Observações`
25. `Data de Criação`
26. `Data de Atualização`
27. `Setor / Gerência da Telefonia`
28. `Tabela Base de Clientes (JSON)`
29. `CNPJ`
30. `Renovação Automática (Sim/Não)`
31. `Moeda`
32. `Periodicidade`
33. `1ª Competência (DD/MM/AAAA)`
34. `Data do Reajuste`
35. `Sem Reajuste`
36. `Reajuste Aplicado (%)`
37. `Impostos / Encargos (%)`
38. `Taxa de Câmbio`
39. `Valor Base em BRL`
40. `Contingência (%)`
41. `Valor Orçado por Lançamento`
42. `Contrato / PO`
43. `Risco (Baixo, Médio, Alto)`
44. `Descrição do Risco / Contingência`
45. `Fonte / Memória de Cálculo`

### 10.3 Estrutura da Aba Acessos_Alcadas (10 Colunas)
1. `ID do Usuário`
2. `Colaborador`
3. `E-mail`
4. `Setor / Gerência Permitida`
5. `Papel / Alçada`
6. `Substituto Temporário (E-mail)`
7. `Início da Substituição`
8. `Término da Substituição`
9. `Substituição Indeterminada (Sim/Não)`
10. `Status`
