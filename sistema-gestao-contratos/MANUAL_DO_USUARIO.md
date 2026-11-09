# Manual do Usuário - Painel de Contratos | Gestão Telefonia
**Gerência Executiva de Telefonia · brisanet**

---

## 1. Visão Geral do Sistema
O Painel de Contratos da Gerência Executiva de Telefonia da brisanet foi concebido para centralizar a governança operacional, financeira e documental dos contratos de telecomunicações.

O sistema opera no modelo relacional fornecedor-contrato, no qual cada fornecedor corporativo agrupa seus respectivos contratos organizados por setor da telefonia e espelhados em pastas dedicadas no Google Drive corporativo.

---

## 2. Acesso e Interface do Usuário
A interface segue rigorosamente a identidade visual da brisanet, estruturada com a paleta oficial (#FF5022, #2242D4, #0B316D, #D0FF60, #E47D20, #9F4016, #DA2468, #E8E8E8), tipografia Figtree e ausência de emojis.

A tela principal é composta por:
1. **Cabeçalho Institucional:** Identificação do sistema, links rápidos para a Planilha Oficial e para o Google Drive da Telefonia.
2. **Painel de Indicadores (KPIs):** Total de Contratos, Desembolso Mensal Previsto, Contratos com Vencimento em até 60 dias e Solicitações de Alteração Pendentes.
3. **Navegação por Abas:**
   - **Fornecedores & Contratos:** Visão consolidada em acordeão (drill-down).
   - **Novo Fornecedor:** Cadastro de novos parceiros comerciais.
   - **Central de Aprovações:** Governança formal de alterações, renovações e reajustes não programados.
   - **Trilha Oficial de Auditoria:** Histórico imutável de todas as ações e decisões.

---

## 3. Gestão de Fornecedores

### 3.1 Título Principal por Apelido e Perfil Formal
Na lista de fornecedores, o título principal em destaque é sempre o **Apelido (Nome Usual)** da empresa (ex: *Huawei*, *Cirion*, *Vogel*, *American Tower*), facilitando a identificação imediata pelos colaboradores da telefonia.

Ao expandir o fornecedor, o painel exibe o **Perfil Formal do Fornecedor**, contendo:
- Razão Social completa;
- Nome Fantasia;
- CNPJ formatado;
- Contato Comercial e E-mail Comercial;
- Link direto para a pasta exclusiva do fornecedor no Google Drive.

### 3.2 Cadastro de Novo Fornecedor
Para cadastrar um fornecedor:
1. Acesse a aba **Novo Fornecedor**.
2. Preencha os campos:
   - **Razão Social:** Razão formal registrada na Receita Federal.
   - **Nome Fantasia:** Nome de mercado.
   - **Apelido (Nome Usual):** Nome mais conhecido internamente na telefonia (utilizado como título principal).
   - **CNPJ:** Máscara automática (00.000.000/0000-00).
   - **Telefone Comercial:** Formato com DDD.
   - **E-mail Comercial:** Endereço para notificações e contatos.
   - **Status de Homologação:** Ativo ou Em Homologação.
   - **Observações Internas:** Notas operacionais.
3. Clique em **Salvar Fornecedor**.
4. O fornecedor já nasce validado e ativo, pronto para receber seus contratos.

---

## 4. Cadastro de Novo Contrato

### 4.1 Abertura do Formulário
Dentro do cartão do fornecedor correspondente, clique em **+ Novo Contrato** ou **+ Adicionar Contrato a este Fornecedor**. O formulário abre em janela modal com cantos arredondados preservados, rolagem interna suave e botões de ação fixos na base.

### 4.2 Campos Obrigatórios e Estrutura dos 29 Atributos
O cadastro contempla 6 blocos organizados:

1. **Setor Responsável, Identificação & Objeto:**
   - **Setor / Gerência da Telefonia:** Seleção obrigatória entre as 5 gerências (*GESTAO TELEFONIA*, *OPERACAO E MANUTENCAO DE REDES*, *OPERACOES DE REDES*, *PROJETOS DE IMPLANTACAO* e *TELEFONIA*). O contrato é automaticamente arquivado na pasta desta gerência no Google Drive.
   - **Tipo de Contrato:** Suporte Técnico, Assessoria e Consultoria Empresarial, Serviços de Terceiros, Interconexão ou personalização via "+ Adicionar outro tipo...".
   - **CNPJ:** Preenchido e travado a partir do cadastro do fornecedor.
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

## 5. Central de Aprovações & Governança de Mudanças

### 5.1 Diretriz Operacional
Todos os fornecedores e contratos cadastrados no sistema já nascem aprovados e ativos, pois sua formalização prévia foi verificada antes da inclusão no sistema.

A **Central de Aprovações** é utilizada para governança de **Mudanças Contratuais**:
- Alterações contratuais e de escopo;
- Renovações de vigência (aditivos de prazo);
- Reajustes não programados ou extraordinários;
- Migração de faixas de faturamento por base de clientes.

### 5.2 Fluxo de Solicitação e Decisão Formal
1. O gestor abre a solicitação através do botão **+ Nova Solicitação de Alteração** ou na Ficha 360 do contrato (**Solicitar Alteração / Aprovação**).
2. Informa o contrato alvo, o tipo de mudança, o detalhamento da proposta, a alçada requerida (Coordenador, Gerente ou Gerente Executivo), o e-mail do responsável e a justificativa técnica.
3. O status do contrato passa para `Em Alteração (Aguardando Aprovação)`.
4. O responsável notificado acessa a Central de Aprovações, avalia o memorial e registra sua decisão:
   - **Aprovar:** O contrato retorna ao status `Vigente`, e a decisão é gravada com carimbo cronológico oficial.
   - **Solicitar Ajustes:** O parecer descreve os apontamentos necessários para correções.
5. Toda decisão gera registro imutável na Trilha Oficial de Auditoria e notificação aos envolvidos.

---

## 6. Alteração de Faixa Vigente (Base de Clientes)
Quando o índice de reajuste for baseado em Base de Clientes:
1. Abra a **Ficha 360** do contrato e acesse a aba **Financeiro**.
2. A tabela de faixas destaca em verde qual faixa está em vigor atualmente.
3. Se o número de assinantes migrar para uma nova faixa, clique no botão **Alterar Faixa Vigente**.
4. Selecione a nova faixa e confirme.
5. O sistema atualiza o valor mensal, recalcula o desembolso e registra a alteração na Trilha Oficial de Auditoria.

---

## 7. Trilha Oficial de Auditoria
A aba **Trilha Oficial de Auditoria** registra todos os eventos operacionais do sistema com:
- Protocolo sequencial do evento;
- Data e hora exatas no formato oficial DD/MM/AAAA - HH:MM:SS (America/Fortaleza);
- E-mail e perfil do responsável pela ação;
- Tipo de ação realizada (Criação, Alteração, Upload de Anexo, Aprovação, Devolução);
- Valores comparativos ("Antes" versus "Depois");
- Justificativa técnica e parecer formal.

Os registros não podem ser editados ou excluídos pelos usuários, servindo como registro oficial para auditorias internas e governança corporativa da brisanet.
