# Manual do Usuário: Sistema de Gestão de Contratos
**Gerência Executiva de Telefonia - Grupo Brisanet**

---

## 1. Apresentação e Objetivos do Sistema

O **Sistema de Gestão de Contratos da Telefonia** é a plataforma corporativa oficial desenvolvida exclusivamente para atender as operações, a esteira de governança e a gestão documental da **Gerência Executiva de Telefonia** d'**a brisanet**.

### Principais Benefícios:
*   **Visão Centrada no Fornecedor (Modelo Acordeão):** Apresentação consolidada dos parceiros comerciais com expansão imediata para a lista de contratos vinculados.
*   **Repositório Oficial no Google Drive:** Criação e organização automática da pasta raiz `Contratos - Gerência Executiva de Telefonia` com 5 subpastas padronizadas por contrato.
*   **Esteira Formal de Alçadas de Aprovação:** Fluxo integrado para validações formais de Coordenadores, Gerentes e Gerente Executivo.
*   **Trilha Oficial de Auditoria Imutável:** Registro cronológico à prova de adulteração com data/hora no Horário de Brasília (UTC-3), e-mail corporativo, ação, valores antes/depois e pareceres.
*   **Certificado Oficial de Conformidade:** Emissão de folha de rosto com assinatura digital em hash para anexação comprobatória.

---

## 2. Acesso ao Sistema

O sistema pode ser acessado por dois canais oficiais:

1.  **Acesso Direto via WebApp (Navegador):**
    *   Utilize o link corporativo da aplicação web disponibilizado pela equipe de TI/Gestão Telefonia.
    *   Certifique-se de estar conectado com sua conta corporativa do Google Workspace (`@grupobrisanet.com.br`).
2.  **Acesso Integrado via Google Sheets:**
    *   Abra a Planilha Oficial de Contratos.
    *   No menu superior, clique em **Gestão Telefonia** &rarr; **Abrir Painel Corporativo**.

---

## 3. Guia Passo a Passo: Setor Administrativo (Gestão Telefonia)

O setor **Gestão Telefonia** atua como operador mestre do sistema, responsável pelo cadastro, classificação documental, submissão de aprovações e controle de prazos.

### 3.1 Navegação por Fornecedores e Contratos
1.  Na aba superior, selecione **Fornecedores & Contratos**.
2.  Visualize os cartões dos fornecedores cadastrados. Cada cartão exibe:
    *   Razão Social e CNPJ do fornecedor.
    *   Status de homologação (`Ativo`, `Em Homologação`).
    *   Total de contratos ativos e valor mensal consolidado.
    *   Botão **Drive** com link direto para a pasta do fornecedor no Google Drive.
3.  **Para visualizar os contratos:** Clique sobre o cartão do fornecedor. O acordeão se expandirá, revelando a tabela de contratos vinculados.
4.  Utilize a barra de pesquisa superior para filtrar rapidamente por nome do fornecedor, CNPJ, número de protocolo ou objeto do serviço.

### 3.2 Cadastrar um Novo Contrato e Provisionar o Drive
1.  Clique na aba superior **Novo Contrato**.
2.  **Seção 1 - Fornecedor:** Informe a Razão Social, Nome Fantasia, CNPJ e o Objeto resumido da contratação.
3.  **Seção 2 - Vigência:** Selecione a modalidade (Voz, Links Dedicados, Torres, Infraestrutura, etc.), data de início e término da vigência.
4.  **Seção 3 - Financeiro & Classificação:** Preencha o valor mensal em R$, índice de reajuste contratual (IPCA, IGP-M, etc.), mês de aniversário, centro de custo e o e-mail do gestor técnico.
5.  Clique em **Cadastrar Contrato e Criar Pastas no Drive**.
6.  **O que o sistema faz automaticamente:**
    *   Gera o protocolo sequencial oficial no padrão `BRISA-TEL-{ANO}-{ID}`.
    *   Cria a pasta do fornecedor no Google Drive caso seja um parceiro novo.
    *   Cria a pasta do contrato com as **5 subpastas padronizadas**:
        *   `01_Contrato_Principal`
        *   `02_Termos_Aditivos`
        *   `03_Documentos_Tecnicos`
        *   `04_Boletins_Medicao`
        *   `05_Aprovacoes_e_Pareceres`
    *   Registra o evento inaugural na Trilha Oficial de Auditoria.

### 3.3 Utilizar a Ficha 360° do Contrato
Na lista de contratos vinculados ao fornecedor, clique no botão **Abrir Ficha 360°**:
*   **Aba Resumo & Cadastro:** Visão completa dos dados gerais, partes e contatos.
*   **Aba Financeiro & Reajustes:** Consulta do valor mensal, índice acordado e comprometimento financeiro anual.
*   **Aba Documentos no Drive:** Visualização e acesso direto às 5 subpastas de documentos no Google Drive.
*   **Aba Termos Aditivos:** Histórico acumulado de acréscimos de valor ou prorrogações de vigência.
*   **Aba Auditoria & Certificado:** Linha do tempo com histórico de aprovações e botão para emissão da folha de rosto oficial.

### 3.4 Submeter Contrato para Aprovação Formal
1.  Dentro da Ficha 360° do contrato, clique em **Submeter para Aprovação**.
2.  Selecione a alçada correspondente:
    *   `Coordenador`: Aprovação técnica de escopo e volumetria.
    *   `Gerente`: Validação de orçamento e alçada tática.
    *   `Gerente Executivo`: Contratos de grande porte ou decisões estratégicas.
3.  Informe o e-mail institucional do aprovador e redija a **Justificativa Operacional / Parecer Técnico**.
4.  Clique em **Enviar para Aprovação**. O contrato passa imediatamente para o status `Aguardando Aprovação` e o aprovador recebe uma notificação por e-mail com as instruções de decisão.

### 3.5 Emitir o Certificado Oficial de Auditoria
1.  Na Ficha 360° do contrato, acesse a aba **Auditoria & Certificado**.
2.  Clique em **Gerar Certificado de Auditoria**.
3.  O sistema compilará em tela a folha oficial com:
    *   Identificação visual institucional d'**a brisanet**.
    *   Dados contratuais e financeiros vigentes.
    *   Cronologia completa e imutável de todas as decisões tomadas.
    *   Assinatura digital com hash de autenticidade no padrão `BRISA-AUDIT-...`.
4.  Clique em **Imprimir / Salvar PDF** para arquivamento ou anexação no processo.

---

## 4. Guia Passo a Passo: Aprovadores (Coordenador, Gerente e Gerente Executivo)

Os aprovadores exercem papel decisório na governança dos contratos da Telefonia, avaliando a conformidade técnica e orçamentária.

### 4.1 Recebimento da Solicitação
*   Ao ser indicado em uma esteira de aprovação, você receberá um e-mail com o assunto:  
    `[brisanet] Solicitacao de Aprovacao de Contrato - {Alcada} (CT #{ID})`.
*   O e-mail contém o resumo do objeto, valor mensal, solicitante e o link de acesso rápido.

### 4.2 Decisão na Central de Aprovações
1.  Acesse o sistema e clique na aba **Central de Aprovações**.
2.  Localize a solicitação atribuída à sua alçada.
3.  Analise os dados do contrato, a justificativa do solicitante e, se necessário, consulte a pasta de documentos no Drive.
4.  **Para Aprovar:**
    *   Clique no botão verde **Aprovar**.
    *   Confirme o registro da aprovação formal. Sua decisão será autenticada digitalmente e o solicitante será informado.
5.  **Para Solicitar Ajustes (Devolver):**
    *   Clique no botão terracota **Solicitar Ajustes**.
    *   No modal que se abrirá, preencha o campo **Parecer Oficial / Apontamentos** descrevendo de forma detalhada o que precisa ser corrigido ou complementado.
    *   Clique em **Confirmar Registro**. O contrato retornará imediatamente à Gestão Telefonia com o status `Devolvido para Ajustes`.

---

## 5. Estrutura Padrão no Google Drive

Toda a documentação deve ser organizada estritamente dentro da estrutura padronizada criada pelo sistema:

```
[DRIVE] Contratos - Gerência Executiva de Telefonia/
│
├── 00_Configuracoes_e_Modelos/
│
├── {NOME_FORNECEDOR}/
│   └── CT-{ANO}-{ID} - {Objeto}/
│       ├── 01_Contrato_Principal/          -> Minutas e instrumento assinado
│       ├── 02_Termos_Aditivos/             -> Termos aditivos averbados
│       ├── 03_Documentos_Tecnicos/         -> Propostas comerciais, SLAs e topologias
│       ├── 04_Boletins_Medicao/            -> Relatórios e atestes de serviços
│       └── 05_Aprovacoes_e_Pareceres/      -> Evidências de e-mails e despachos
```

---

## 6. Boas Práticas e Padrões da Marca

*   **Identidade da Marca:** Refira-se sempre no feminino: **a brisanet**. A grafia da marca é sempre em caixa baixa (**brisanet** ou **brisa**).
*   **Comunicação Direta:** Textos curtos, objetivos e fundamentados, focados em conformidade técnica e eficiência operacional.
*   **Zero Emojis:** É proibida a utilização de emojis em títulos, despachos, relatórios ou pareceres contratuais.
*   **Suporte e Dúvidas:** Entre em contato com a equipe da **Gestão Telefonia** pelo e-mail institucional corporativo.
