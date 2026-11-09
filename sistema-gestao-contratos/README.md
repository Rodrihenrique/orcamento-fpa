# Painel de Contratos | Gestão Telefonia - Telefonia
**Gerência Executiva de Telefonia · brisanet**

Sistema corporativo de gestão do ciclo de vida de contratos (Contract Lifecycle Management) desenvolvido para a Gerência Executiva de Telefonia da brisanet.

---

## Principais Recursos
- **Hierarquia por Fornecedor (Drill-down):** Fornecedores exibidos pelo **Apelido (Nome Usual)** como título principal, com perfil formal (Razão Social, Nome Fantasia, CNPJ, Contatos e Pasta no Drive) expandido.
- **Estrutura por 5 Gerências:** A pasta raiz no Google Drive contém exclusivamente as 5 pastas setoriais da Telefonia (*GESTAO TELEFONIA*, *OPERACAO E MANUTENCAO DE REDES*, *OPERACOES DE REDES*, *PROJETOS DE IMPLANTACAO* e *TELEFONIA*). No formulário de Novo Fornecedor, o campo Setor define em qual gerência a pasta daquele parceiro será criada.
- **Base Oficial de Contratos:** Linha 1 de cabeçalho da aba Contratos formatada com os 45 títulos oficiais amigáveis correspondentes aos campos do formulário corporativo.
- **29 Atributos Contratuais:** Formulário com máscaras automáticas (CNPJ, Moeda, Taxa de Câmbio, Percentuais, Datas), vigência indeterminada, reajuste por base de clientes e upload direto para a subpasta `01_Contrato_Principal`.
- **Tabela de Faixas por Base de Clientes com Faixa Atual:** Campo de seleção tipo "bolinha" (radio button) para indicar a faixa em vigor atual, com rotina de atualização operacional quando o número de assinantes cresce.
- **Governança de Mudanças (Central de Aprovações):** Contratos cadastrados nascem ativos e validados. A esteira de aprovações é reservada para alterações de escopo, renovações, reajustes não programados e migração de faixas por alçada formal (Coordenador, Gerente, Gerente Executivo).
- **Trilha Oficial de Auditoria:** Registro cronológico detalhado com data, hora, responsável, ação e pareceres.
- **Identidade Visual brisanet:** Aplicação estrita da paleta oficial (#FF5022, #2242D4, #0B316D, etc.), fontes Figtree/Rubik, "a brisanet" no feminino e ausência total de emojis.

---

## Estrutura dos Arquivos
- `Code.gs`: Backend em Google Apps Script gerenciando Google Sheets relacional (45 colunas estruturadas na aba Contratos), Google Drive, disparo de e-mails formais e trilha de auditoria.
- `Index.html`: Frontend responsivo em HTML5, CSS3 e JavaScript nativo com modais com cantos arredondados (16px), acordeão de fornecedores, máscaras de preenchimento e Ficha 360°.
- `MANUAL_DO_USUARIO.md`: Guia detalhado passo a passo de operação para os colaboradores.
