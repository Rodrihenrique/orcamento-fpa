# Painel de Contratos | Gestão Telefonia
**Gerência Executiva de Telefonia · brisanet**

Sistema corporativo de gestão do ciclo de vida de contratos (Contract Lifecycle Management) desenvolvido para a Gerência Executiva de Telefonia da brisanet.

---

## Principais Recursos
- **Hierarquia por Fornecedor (Drill-down):** Fornecedores exibidos pelo **Apelido (Nome Usual)** como título principal, status operacional interativo (**ATIVO / ENCERRADO**), alerta preventivo discreto de vencimento próximo (60 dias), métricas de **Contratos Ativos**, **Desembolso Mensal** e **Desembolso Anual**, além de perfil formal (Razão Social, Nome Fantasia, CNPJ, Contatos e Pasta no Drive) expandido.
- **Cálculo de Desembolso Anual:** Exibido no cabeçalho de cada parceiro e na tabela de contratos individuais, projetando o custo anual do contrato (Valor Mensal x 12).
- **Estrutura por 5 Gerências:** A pasta raiz no Google Drive contém exclusivamente as 5 pastas setoriais da Telefonia (*GESTAO TELEFONIA*, *OPERACAO E MANUTENCAO DE REDES*, *OPERACOES DE REDES*, *PROJETOS DE IMPLANTACAO* e *TELEFONIA*). No formulário de Novo Fornecedor, o campo Setor define em qual gerência a pasta daquele parceiro será criada.
- **Controle de Acessos Dinâmico e Limpeza de Planilha:** Mapeamento dinâmico de cabeçalhos na aba `Acessos_Alcadas` (compatível com ou sem coluna 'ID do Usuário') e rotina de exclusão de abas residuais (`Página2` e `Página3`).
- **Designação de Substituto Temporário durante Ausência:** Permite ao gestor designar um substituto temporário por período determinado ou indeterminado, delegando alçadas formais de aprovação.
- **Alertas de Reajuste Periódico de Valor (5 Dias Antes):** Banner de alerta executivo notificando gestores e o setor Administrativo 5 dias antes de repactuações periódicas de valor.
- **E-mail do Responsável pelo Contrato:** Campo obrigatório no Módulo 1 do cadastro contratual, armazenado na planilha e integrado a alertas e governança.
- **Controle de Logs por Contrato (Ficha 360°):** Histórico individual e imutável de alterações em cada contrato.
- **Log de Alterações em Linha do Tempo Acordeon:** Central de monitoramento com timeline executiva, botão unificado **Expandir / Recolher Todos**, e filtros multidimensionais por Gerência, Fornecedor e Contrato.
- **Base Oficial de Contratos (45 Colunas):** Linha 1 de cabeçalho da aba Contratos formatada com títulos oficiais amigáveis correspondentes a todos os campos do formulário corporativo.
- **Tabela de Faixas por Base de Clientes:** Seleção de faixa em vigor com radio button ("bolinha") e atualização dinâmica.
- **Governança de Mudanças (Central de Aprovações):** Contratos cadastrados nascem ativos e validados. A esteira de aprovações é reservada para alterações de escopo, renovações, reajustes extraordinários e migração de faixas.
- **Identidade Visual brisanet:** Aplicação estrita da paleta oficial (#FF5022, #2242D4, #0B316D, etc.), fontes Figtree/Rubik, "a brisanet" no feminino e ausência total de emojis.

---

## Estrutura dos Arquivos
- `Code.gs`: Backend em Google Apps Script gerenciando Google Sheets relacional (45 colunas na aba Contratos e 10 colunas em Acessos_Alcadas), Google Drive, disparo de e-mails formais e trilha de auditoria.
- `Index.html`: Frontend responsivo em HTML5, CSS3 e JavaScript nativo com modais com cantos arredondados (16px), acordeão de fornecedores, máscaras de preenchimento, Ficha 360°, banner de alertas e Log de Alterações em acordeão por contrato com linha do tempo executiva.
- `MANUAL_DO_USUARIO.md`: Guia detalhado passo a passo de operação para os colaboradores.
