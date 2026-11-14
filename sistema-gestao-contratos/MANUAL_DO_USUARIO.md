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
1. **Cabeçalho Institucional:** Identificação do sistema, badge de e-mail do usuário logado, papel, setor permitido com indicador de acesso (Acesso Total ou Acesso Restrito), badge de substituto ativo (quando aplicável), **sininho de notificações** (organizado em ordem cronológica decrescente com os eventos e solicitações mais recentes no topo, cards detalhando data/hora da ocorrência, alertas clicáveis de contratos próximos do vencimento/vencidos e aprovações solicitadas pendentes, barra de rolagem vertical e opção **Ler todas** que limpa a contagem do badge preservando os itens na lista), botão de designação de substituto temporário e links diretos para a Planilha Oficial e para o Google Drive da Telefonia.
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

### 3.2 Estrutura da Aba Acessos_Alcadas e Limpeza de Abas Auxiliares
- **Coluna "ID do Usuário":** No Google Apps Script e Google Workspace, a autenticação e verificação de perfil ocorrem de forma nativa e segura através do e-mail corporativo (`Session.getActiveUser().getEmail()`). A coluna "ID do Usuário" na aba `Acessos_Alcadas` era apenas um identificador numérico interno opcional (matrícula/UID) e **não é necessária** para o funcionamento do sistema. Ela pode ser excluída da planilha sem qualquer impacto, pois o backend mapeia as colunas dinamicamente pelos títulos dos cabeçalhos.
- **Abas Auxiliares "Página2" e "Página3":** Essas abas eram listas residuais de colaboradores criadas na importação/geração inicial da planilha. O sistema de contratos utiliza exclusivamente as abas oficiais (`Fornecedores`, `Contratos`, `Acessos_Alcadas`, `Auditoria_Logs`, `Aprovacoes_Solicitadas` e `Aditivos`). Portanto, as abas `Página2` e `Página3` **podem ser excluídas com total segurança**. O sistema conta inclusive com a rotina automática `limparAbasEEstruturaAcessos()` no código para realizar essa limpeza operacional.

### 3.3 Designação de Substituto Temporário durante Ausência
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

### 5.1 Título Principal por Apelido, Status Interativo e Alerta de Vencimento
Na lista de fornecedores:
- **Título por Apelido:** O título principal em destaque é sempre o **Apelido (Nome Usual)** da empresa (ex: *Huawei*, *Cirion*, *Vogel*, *American Tower*), facilitando a identificação imediata pelos colaboradores da telefonia.
- **Status Operacional Alterável (Lista Suspensa):** Ao lado do título e do CNPJ, a tag de status é uma lista suspensa interativa com as opções **ATIVO** (verde), **HOMOLOGAÇÃO** (âmbar, para fornecedores em fase de negociação) e **ENCERRADO** (cinza neutro). Ao alterar o status diretamente no painel, a alteração é gravada em tempo real na aba `Fornecedores` e registrada com carimbo cronológico na trilha de auditoria.
- **Edição Completa do Perfil do Fornecedor:** O botão **Editar Perfil** (disponível tanto no cabeçalho do cartão do fornecedor quanto no bloco *Perfil Formal do Fornecedor*) permite alterar todos os campos do formulário de fornecedor: **Razão Social**, **Nome Fantasia**, **Apelido**, **Setor / Gerência da Telefonia**, **CNPJ**, **Telefone / Contato Comercial**, **E-mail Comercial**, **Status de Homologação** (`ATIVO`, `HOMOLOGAÇÃO`, `ENCERRADO`) e **Observações Internas / Sobre o Fornecedor**. Se Razão Social, CNPJ ou Setor mudarem, os contratos vinculados e a pasta no Google Drive são sincronizados/movidos automaticamente e todas as alterações são registradas na trilha de auditoria.
- **Exclusão de Fornecedores e Contratos:** Os botões **Excluir Fornecedor** (no bloco *Perfil Formal do Fornecedor* e dentro do modal *Editar Perfil*) e **Excluir** / **Excluir Contrato** (na linha de cada contrato e no rodapé da *Ficha 360°*) abrem confirmação explícita para remover os registros selecionados (incluindo contratos, aprovações e aditivos vinculados no caso de exclusão de fornecedor), com opção de mover a pasta no Google Drive para a Lixeira e registro definitivo na auditoria.
- **Paginação da Lista de Fornecedores (10 por página):** A visualização *Fornecedores & Contratos* exibe até 10 fornecedores por página com barra de navegação (*Anterior*, números de página e *Próxima*) e contador de registros exibidos.
- **Alerta Discreto de Vencimento Próximo:** Sempre que um fornecedor possuir contratos vigentes com vencimento previsto para os próximos 60 dias ou menos, o sistema exibe um badge discreto e elegante em tom âmbar suave ao lado do status (`Vence em X dias`), permitindo rápida identificação visual preventiva sem poluição visual.
- **Métricas Executivas no Cabeçalho:** Cada fornecedor exibe seus três indicadores consolidados:
  - **Contratos Ativos:** Proporção de contratos vigentes sobre o total (ex: *1 de 1*).
  - **Desembolso Mensal:** Soma mensal dos contratos vigentes do fornecedor.
  - **Desembolso Anual:** Custo anual consolidado do fornecedor, calculado pela soma dinâmica do Desembolso Anual efetivo de cada contrato ativo (multiplicando o valor mensal pelos meses de cobrança de cada contrato).

Ao expandir o fornecedor, o painel exibe:
1. **Perfil Formal do Fornecedor:** Razão Social, Nome Fantasia, Apelido, CNPJ formatado, Contato Comercial, E-mail Comercial e Link da Pasta no Drive.
2. **Tabela de Contratos do Fornecedor:** Protocolo, Objeto & Setor, Vigência, **Valor Mensal**, **Desembolso Anual** (valor anual individual daquele contrato), Critério de Reajuste, Alçada/Status e Botão para Abrir Ficha 360°.

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
   - **E-mail do Responsável pelo Contrato:** Lista suspensa populada dinamicamente a partir dos responsáveis ativos cadastrados na aba `Acessos_Alcadas` (iniciando sem seleção prévia para evitar preenchimento automático com o e-mail do usuário logado), definindo o gestor destinatário de alertas de reajuste e governança.
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
   - **Taxa de Câmbio:** Cotação para conversão cambial (para moedas diferentes de BRL, converte o Valor Unitário na moeda de origem para Real no Valor Mensal Total e nos totais anuais/ciclo).
   - **Multiplicador de Serviços & Conversão Cambial:**
     - **Valor Unitário do Serviço:** Valor unitário na moeda selecionada (ex: 5.600,00 USD ou R$ 43.000,00 BRL).
     - **Quantidade de Serviços:** Número de serviços contratados (ex: 3 serviços).
     - **Valor Mensal Total (BRL):** Cálculo dinâmico sempre exibido e consolidado em Reais: `Valor Unitário × Quantidade de Serviços × Taxa de Câmbio` (ex: 5.600,00 USD × 1 × 5,3000 = R$ 29.680,00 BRL). Permite edição direta manual sincronizada em BRL (atualizando o Valor Unitário na moeda do contrato).
   - **Período de Cobrança Efetiva (Meses no Ano):**
     - Permite definir a quantidade real de meses faturados no ano (ex: 9 meses em contratos com vigência de 12 meses decorrente de carência, período de implantação ou sazonalidade).
     - O cálculo do **Desembolso Anual** e o card de **Orçamento Anual Comprometido** multiplicam exatamente o Valor Mensal Total em BRL pelos meses efetivos de cobrança (ex: R$ 29.680,00 × 12 = R$ 356.160,00).
   - **Valor Base em BRL & Valor Orçado por Lançamento:** Ambos são sincronizados dinamicamente com o **Desembolso Anual** em BRL (Valor Mensal Total em BRL × Meses de Cobrança Efetiva, ou valor do ciclo para contratos anuais/plurianuais), sem dupla multiplicação cambial, garantindo alinhamento total com as premissas de planejamento orçamentário e finanças (FP&A).
   - **Impostos / Encargos (%):** Percentual retido ou incidente.
   - **Contingência (%):** Margem de segurança orçamentária.
   - **Conta Contábil:** Classificação no plano de contas.

4. **Regras de Reajuste & Base de Clientes:**
   - **Critério / Índice de Reajuste:** IPCA, IGP-M, INPC, Fixo/Sem Reajuste, Base de Clientes ou Personalizado.
   - **Caixa de Seleção "Sem Reajuste":** Desabilita campos de reajuste quando aplicável.
   - **Data do Reajuste & Mês Aniversário:** Ciclo de aplicação do índice.
   - **Reajuste Aplicado (%):** Percentual praticado.
   - **Tabela de Faixas por Base de Clientes (com Seleção de Faixa Atual):**
     Ao selecionar "Base de Clientes", uma tabela dinâmica permite adicionar faixas de assinantes com campos de valores totalmente editáveis. Na frente de cada faixa, há um botão de seleção ("bolinha" / radio button) para indicar em qual faixa o contrato se encontra atualmente. Além disso, a qualquer momento na Ficha 360°, o gestor pode acionar o modal "Reajustar Valores e Faixa Vigente" para editar manualmente os valores monetários de qualquer faixa caso haja repactuação comercial, salvando os novos valores e registrando o evento no Log de Auditoria Oficial.

5. **Governança, Risco & Memória de Cálculo:**
   - **Risco:** Classificação formal (Baixo, Médio ou Alto).
   - **Descrição do Risco / Contingência:** Análise de impacto e mitigação.
   - **Fonte / Memória de Cálculo:** Referência técnica adotada.
   - **Observações Gerais:** Informações complementares.

6. **Anexar Arquivo Oficial do Contrato:**
   - Upload de documentos (PDF, PNG, JPG, JPEG, DOCX, XLSX).
   - O arquivo é transmitido e arquivado diretamente na pasta selecionada pelo usuário (`Contrato`, `Anexos`, `Documentação` ou `NF`) dentro do Google Drive da gerência selecionada.

---

### 6.3 Regra para Contratos Plurianuais e Pagos por Ciclos de Anos (Ex: a cada 5 anos)
Para contratos cujo faturamento ou pagamento ocorra apenas uma vez a cada múltiplos anos (ex: **a cada 5 anos**, bianual, trienal, etc.) ou anual único:
1. **Periodicidade Especial:** No formulário de cadastro e no modal de alteração, selecione opções como *A cada 5 anos (Quinquenal)*, *A cada 2 anos (Bianual)* ou *Personalizado em Anos*.
2. **Desembolso Anual Desativado:** Como a despesa não se repete anualmente (*não tem todo ano*), a coluna e o indicador de **Desembolso Anual** não exibem um valor recorrente anual, exibindo a tag **Não aplicável** acompanhada do valor registrado no ciclo.
3. **Valor Visível e Registrado com Alerta:** O valor total da parcela ou ciclo permanece integralmente registrado e visível em todos os módulos (*Valor do Pagamento no Ciclo*, *Valor Base em BRL* e *Valor Orçado*), acompanhado de badge e aviso visual destacado em laranja:
   - Exemplo: `Alerta: Pago apenas a cada 5 anos (Valor registrado no ciclo: R$ 50.000,00)`.
4. **Governança no Acordeão e KPIs:** O custo do contrato plurianual não inflaciona artificialmente o Desembolso Anual recorrente do fornecedor nem o Orçamento Anual de 12 meses nos anos sem faturamento, mantendo a precisão orçamentária do FP&A.
5. **Integração com Modelo de Faixas:** Caso o contrato utilize a Tabela de Faixas por Base de Clientes, ao selecionar a faixa vigente e a periodicidade plurianual, o sistema aplica instantaneamente a regra de visualização com alerta, sem conversão para desembolso anual contínuo.

---

## 7. Ficha 360° do Contrato & Controle de Logs Individual

Ao clicar em **Abrir Ficha 360°** em qualquer contrato, o modal executivo apresenta quatro abas temáticas:
1. **Resumo & Cadastro:** Dados cadastrais, objeto, prazos, e-mail do gestor responsável e datas formatadas.
2. **Financeiro & Reajustes:** Desembolso, moeda, reajustes e tabela de faixas de base de clientes com indicação destacada da faixa vigente.
3. **Documentos no Drive:** Link direto para a pasta do contrato e interface de visualização e upload direto para as 4 pastas oficiais padronizadas (`Contrato`, `Anexos`, `Documentação` e `NF`).
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

### 8.2 Fluxo de Alteração Contratual pelo Responsável & Governança
1. Ao identificar a necessidade de alteração de valor, vigência/prazo, serviços ou condições, o responsável pelo contrato acessa o sistema e clica em **Realizar Alteração / Aprovação** (na Ficha 360° ou na esteira de governança).
2. O modal interativo permite ao responsável realizar a mudança diretamente:
   - **Objeto do Contrato:** Atualização da descrição do escopo contratado.
   - **Multiplicador de Serviços & Valores:** Ajuste do Valor Unitário, Quantidade de Serviços e Valor Mensal Total com cálculo automático em tempo real.
   - **Período de Cobrança Efetiva:** Definição de meses faturados no ano (ex: 9 meses) e recálculo instantâneo do Desembolso Anual.
   - **Prazos & Vigência:** Atualização da data de início, data de término ou marcação de vigência indeterminada.
   - **Critério de Reajuste e Data:** Alteração de índices (IPCA, IGP-M, Base de Clientes, etc.) e data programada de reajuste.
   - **Situação e Alçada:** Atualização do status operacional (Vigente, Em Alteração, Suspenso, Encerrado) e alçada (Aprovado, Pendente).
   - **Justificativa Operacional Obrigatória:** Campo mandatório para registro formal na trilha de auditoria.
3. Ao clicar em **Salvar Alteração no Contrato**:
   - As alterações são gravadas imediatamente na base oficial de contratos da planilha.
   - Um registro cronológico oficial é gravado na aba `Auditoria_Logs` com o e-mail do responsável, data/hora, campos alterados (*Antes vs Depois*) e parecer.
   - Pendências anteriores de aprovação vinculadas ao contrato são automaticamente concluídas.

---

## 9. Aba Log de Alterações & Histórico na Ficha 360°

A aba **Log de Alterações** transforma a governança do sistema em uma central ativa de acompanhamento e monitoramento de alterações contratuais:
- **Visual em Acordeon por Contrato:**
  - Cada contrato cadastrado com histórico possui seu próprio card de acordeon executivo.
  - O cabeçalho do card exibe o Apelido / Razão Social do fornecedor, protocolo do contrato, gerência/setor, objeto resumido, badge de status e contador de alterações registradas.
  - Clicando no cabeçalho do contrato, o card se expande ou se recolhe suavemente.
  - Botões de controle rápido no topo: **Expandir / Recolher Todos** (botão único toggle idêntico ao painel principal), **Limpar Filtros** e **Atualizar Log**.
  - Eventos não vinculados a um contrato específico (como cadastro de novos fornecedores e alterações de permissões de gestores) são organizados no card *Cadastros Gerais, Fornecedores & Governança*.
- **Linha do Tempo (Timeline) Executiva:**
  - Tanto na página geral de logs quanto dentro do modal de **Ficha 360°** (aba *Log de Alterações*), o histórico é exibido em uma linha do tempo vertical limpa, profissional e responsiva, eliminando tabelas largas que ultrapassavam os limites da tela e removendo a coluna desnecessária de protocolo de log.
  - Cada evento da linha do tempo exibe:
    - Marcador colorido por natureza da ação (azul para cadastros, âmbar para reajustes/alterações de faixa, verde para aprovações).
    - Badge da ação realizada e carimbo de data e hora no padrão `DD/MM/AAAA - HH:MM:SS`.
    - E-mail corporativo do responsável e badge de sua gerência/papel.
    - Comparativo visual de alteração (*Antes vs Depois*) com tag do campo afetado.
    - Caixa de Justificativa e Parecer formal com layout elegante.
- **Filtros Multidimensionais:**
  - **Filtro por Gerência:** Permite isolar os contratos de qualquer gerência específica da Telefonia.
  - **Filtro por Fornecedor:** Dropdown dinâmico com todos os fornecedores da base.
  - **Filtro por Contrato:** Dropdown dinâmico com todos os contratos cadastrados.
  - **Busca Textual em Tempo Real:** Pesquisa rápida por fornecedor, responsável, ação ou justificativa.
- **Política de Privacidade e Acesso por Perfil:**
  - **Gestão Telefonia (Administrativo):** Acesso total e irrestrito (acessoTotal = true) a todos os logs de auditoria de todos os contratos, gerências e colaboradores da organização, com selo indicativo "Visão Completa · Gestão Telefonia (Administrativo)".
  - **Gestores Setoriais:** Acesso restrito exclusivamente às suas próprias alterações (ações originadas por seu e-mail corporativo ou pelo substituto/titular legal se ativo). O seletor de gerência permanece travado em seu setor correspondente e a barra executiva informa "Mostrando apenas suas alterações (email@grupobrisanet.com.br)".
  - **Segurança em Dupla Camada (Backend + Frontend):** A filtragem é aplicada nativamente no servidor Google Apps Script (Code.gs) impedindo o tráfego de dados de outros gestores na rede, e reforçada no cliente (Index.html).

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
`[SETOR] / [Fornecedor] / CT-{ANO}-{ID} - {Objeto} / [Subpastas]`

Cada contrato conta com **4 subpastas padronizadas**:
1. `Contrato`: Minuta aprovada, instrumento contratual assinado e aditivos.
2. `Anexos`: Anexos técnicos, propostas comerciais, escopo e memórias de cálculo.
3. `Documentação`: Certidões negativas, habilitação jurídica e procurações.
4. `NF`: Notas fiscais mensais, boletos de cobrança e comprovantes de faturamento.

No formulário de Novo Contrato e no modal de Ficha 360°, o usuário escolhe a pasta de destino de cada arquivo anexado.

### 10.2 Linha de Cabeçalho Oficial da Aba Contratos (49 Colunas)
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
46. `Quantidade de Serviços`
47. `Valor Unitário`
48. `Meses de Cobrança Efetiva`
49. `Pasta de Destino no Drive`
50. `Forma de Pagamento (Plurianual)`
51. `Quantidade de Parcelas`
52. `Valor por Parcela`

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


---

## 11. Novas Funcionalidades e Ajustes Estruturais Recentes

### 11.1 Otimizacao Visual da Tabela de Contratos (Remocao da Coluna Protocolo)
Para proporcionar uma navegacao mais limpa, funcional e focada nos dados criticos de gestao, a coluna **Protocolo** foi removida da tabela expandida de contratos do fornecedor.
- O espaco horizontal foi redistribuido entre Objeto & Setor, Vigencia, Valor Mensal / Parcela e Desembolso Anual.
- O Protocolo oficial continua sendo gerado normalmente (ex: `BRISA-TEL-2026-0007`), ficando disponivel para consulta na **Ficha 360°**, nos logs de auditoria e no Google Drive.

### 11.2 Mecanismo de Faixas com Opcao "Acima de" (Sem Limite Superior)
Nos contratos com criterio de reajuste por **Base de Clientes (Assinantes)**:
- Foi adicionada a caixa de selecao **Acima de (sem teto)** na coluna "Faixa Ate".
- Ao marcar esta opcao, o campo superior e desabilitado e marcado como `Sem limite (+)`, formalizando que a partir daquela quantidade de clientes o valor contratado se mantem estavel.
- O sub-modal de alteracao de faixa e a visualizacao na Ficha 360° reconhecem automaticamente esse padrao e exibem `Acima de X assinantes (sem teto)`.

### 11.3 Condicoes de Pagamento e Parcelamento para Contratos Plurianuais
Para contratos com periodicidade plurianual (ex: a cada 2, 3, 4, 5 ou 10 anos):
- **Forma de Pagamento:** Permite selecionar **Parcela Unica**, **Mensal**, **Semestral** ou **Anual**.
- **Quantidade de Parcelas:** Campo numerico com definicao automatica conforme o ciclo (ex: 10 parcelas semestrais para um contrato quinquenal de 5 anos).
- **Valor por Parcela:** Calculado automaticamente (`Valor Total do Ciclo / Quantidade de Parcelas`).
- **Visibilidade:** O parcelamento e exibido claramente na coluna de valor da tabela de contratos (`10x (Semestral) · Ciclo: R$ ...`), no modal de alteracao contratual e na Ficha 360°. O Desembolso Anual mantem o selo explicito **Nao aplicavel** com registro do valor do ciclo, evitando lancamentos indevidos nos anos intermediarios sem desembolso.

### 11.4 Esclarecimento sobre a Coluna "ID do Usuario" e Abas Residuais
- **Coluna "ID do Usuario" (Aba Acessos_Alcadas):** Campo legatario facultativo que nao e utilizado pelo sistema de controle de alçadas (a autenticacao baseia-se estritamente no e-mail corporativo). Como a coluna encontra-se vazia, pode ser removida da planilha sem qualquer efeito adverso. O sistema esta programado para operar tanto com a planilha possuindo essa coluna quanto iniciando diretamente em Colaborador.
- **Abas "Pagina2" e "Pagina3":** Trata-se de copias/rascunhos obsoletos sem vinculacao com as rotinas ativas. Podem ser excluidas manualmente ou pela funcao automatica `limparAbasEEstruturaAcessos()` do Apps Script.

### 11.5 Upload Adicional de Multiplos Arquivos na Ficha 360°
Na aba **Documentos** da Ficha 360° de qualquer contrato:
- O campo **Upload Adicional de Documentos** suporta agora selecao multipla simultanea de arquivos (`multiple`).
- O gestor pode selecionar quantos arquivos desejar em uma unica acao (segurando Ctrl ou Shift, ou selecionando em lote).
- Os arquivos selecionados sao listados individualmente com nome, tamanho em KB e indicador de tamanho total em MB.
- O botao de acao ajusta-se dinamicamente (`Fazer Upload de X Arquivo(s) para o Drive`).
- Todos os arquivos sao transferidos e gravados de forma segura na subpasta escolhida (`Contrato`, `Anexos`, `Documentacao` ou `NF`), gerando os respectivos registros individuais de auditoria.

### 11.6 Filtro por Tipo de Contrato, Edicao Completa Financeiro & Correcao de Logs de Upload
- **Filtro por Tipo de Contrato:** Na barra de filtros da pagina *Fornecedores & Contratos*, o seletor **Tipo** e preenchido dinamicamente com todos os tipos de contrato cadastrados (ex: *Suporte Tecnico*, *Interconexão*, *Assessoria e Consultoria Empresarial*, *Servicos de Terceiros* e tipos personalizados). Cada linha de contrato exibe um marcador discreto com o respectivo Tipo ao lado da gerencia.
- **Botao Realizar Alteracoes na Aba Financeiro & Reajustes (Ficha 360°):** O botao **Realizar Alteracao / Aprovacao** agora tambem esta disponivel diretamente no rodape da aba *Financeiro & Reajustes*. O modal de alteracao permite editar **Tipo de Contrato**, **Moeda e Taxa de Cambio**, **Impostos/Encargos (%)**, **Contingencia (%)**, **Conta Contabil**, **Data e Condicao Sem Reajuste**, **Mes Aniversario**, **Reajuste Aplicado (%)**, **Nivel e Descricao de Risco**, **Fonte / Memoria de Calculo** e **Observacoes Gerais**. Toda modificacao e gravada individualmente com valor anterior e novo valor no **Log de Alteracoes**.
- **Vinculacao Precisa de Uploads ao Contrato nos Logs:** Os uploads na Ficha 360° registram o **ID oficial do contrato** e os metadados de fornecedor/protocolo na auditoria, alem de o carregamento de logs realizar correspondencia direta pelo `pastaDriveId` sem utilizar `parseInt` em IDs alfanumericos do Google Drive, garantindo que uploads feitos para um fornecedor nunca sejam exibidos sob outro contrato.

### 11.7 Contratos Vencidos / Encerrados Apenas para Historico & Status do Fornecedor
- **Contratos Encerrados ou Vencidos sem Atualizacao:** Contratos cuja vigencia terminou (`Data Fim` anterior a data atual e sem marcacao de *Vigencia Indeterminada* ou renovacao) ou marcados como *Encerrado*, *Cancelado*, *Vencido*, *Suspenso* ou *Inativo* permanecem listados no painel e na Ficha 360° exclusivamente para consulta historica e auditoria. Seus valores nao sao somados nos totalizadores de **Desembolso Mensal**, **Desembolso Anual**, **Orcamento Anual** nem na contagem de **Contratos Ativos** (tanto nos cards KPI quanto no cabecalho de cada fornecedor).
- **Alternancia Persistente de Status ATIVO / HOMOLOGACAO / ENCERRADO do Fornecedor:** A alteracao do status operacional diretamente na linha de cada fornecedor grava imediatamente na aba `Fornecedores` (incluindo fornecedores oriundos de planilhas legadas de 9 colunas ou cadastrados via importacao de contratos), registra a acao no `Auditoria_Logs`, recalcula os totalizadores do painel e permanece salva apos atualizar a pagina. A opcao **HOMOLOGACAO** atende fornecedores ainda em fase de negociacao.

### 11.8 Regra Orcamentaria por Exercicio Fiscal (Contratos Encerrados no Ano Corrente)
- **Contratos encerrados/vencidos no ano corrente (ex: 2026):** Permanecem fora da contagem de *Contratos Ativos* e do *Desembolso Mensal* (por nao haver faturamento futuro continuo), mas **compoem normalmente o Orcamento / Desembolso Anual do ano corrente**, exibindo a identificacao `Compoe orcamento 2026`.
- **Contratos encerrados/vencidos em anos anteriores (ex: 2025, 2024):** Sao preservados apenas para historico e auditoria (`Historico - Nao somado`), sem somar em mensal nem anual.

### 11.9 Links Diretos para o Contrato Exato nos E-mails de Alteracao e Aprovacao
- Todos os e-mails de registro/alteracao contratual, solicitacao de aprovacao, decisao de aprovacao/ajustes, alerta de vencimento e solicitacao de alteracao da Gestao Telefonia incluem um botao e link direto (`?contratoId=<id>`) gerados automaticamente para o contrato especifico que exige acao.
- Ao abrir o link recebido no e-mail, o sistema navega automaticamente para o fornecedor correspondente, posiciona a paginacao correta e abre diretamente a **Ficha 360°** do contrato exato.

### 11.10 Governança de Alterações Contratuais: Solicitação por Gestores e Execução Exclusiva pela Gestão Telefonia
- **Segregação de Papéis e Permissões:**
  - **Setor Gestão Telefonia:** É o único setor autorizado a executar alterações diretamente na base de dados de contratos e reajustar faixas vigentes de assinantes. O botão **Realizar Alteração** é exibido exclusivamente para usuários deste setor.
  - **Demais Setores (Gerências Técnicas, Analistas, Coordenadores):** Possuem acesso restrito a **Solicitar Alteração**, não podendo editar valores ou cláusulas diretamente.
- **Fluxo Operacional de Solicitação:**
  1. O gestor identifica a necessidade de ajuste em um contrato e clica em **Solicitar Alteração** (no rodapé da *Ficha 360°* ou na *Central de Aprovações*).
  2. No modal, descreve detalhadamente o que precisa ser alterado e confirma o envio.
  3. A demanda é direcionada para o setor **Gestão Telefonia** (`gestao.telefonia@grupobrisanet.com.br` e equipe técnica) via e-mail formal contendo os dados do contrato, a justificativa e o botão com link direto para o contrato exato.
  4. O contrato recebe a sinalização `Solicitação de Alteração Pendente` e o log de auditoria é registrado.
- **Execução Técnica e Envio para Aprovação do Responsável:**
  1. A equipe de Gestão Telefonia abre o contrato e realiza os ajustes técnicos no sistema.
  2. Ao salvar, o sistema altera o status do contrato para `Em Alteração (Aguardando Aprovação)`, cria a pendência na *Central de Aprovações* vinculada ao **Responsável pelo Contrato** e dispara um e-mail para o gestor com os detalhes das mudanças e o botão **Avaliar e Aprovar Alteração Contratual**.
  3. Todas as etapas ficam registradas na linha do tempo da *Ficha 360°* e no *Log de Alterações*.
