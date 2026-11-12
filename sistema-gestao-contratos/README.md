# Painel de Contratos | Gestão Telefonia
**Gerência Executiva de Telefonia · brisanet**

Sistema corporativo de gestão do ciclo de vida de contratos (Contract Lifecycle Management) desenvolvido para a Gerência Executiva de Telefonia da brisanet.

---

## Principais Recursos
- **Regra Orcamentaria Anual & Status de Fornecedor Persistente:** Contratos encerrados/vencidos no exercicio corrente continuam compondo o Orcamento Anual do respectivo ano (sem somar no mensal ativo); contratos encerrados em anos anteriores permanecem exclusivamente para historico e auditoria sem somar no mensal nem anual.
- **Filtro por Tipo de Contrato & Edicao Financeira Completa na Ficha 360°:** Filtragem dinamica por tipo de contrato na listagem principal e botao *Realizar Alteracao / Aprovacao* disponivel tambem na aba *Financeiro & Reajustes* cobrindo moeda, cambio, encargos, reajustes, riscos, memoria de calculo e rastreabilidade completa em logs.
- **Upload Multiplo na Ficha 360°:** Possibilidade de anexar multiplos arquivos simultaneamente nas subpastas padronizadas do contrato no Google Drive (`Contrato`, `Anexos`, `Documentacao`, `NF`), com pre-visualizacao de arquivos selecionados, calculo de peso total e envio em lote otimizado.
- **Sininho de Notificações com Ordem Cronológica:** Notificações de contratos próximos do vencimento/vencidos e aprovações solicitadas pendentes organizadas estritamente em ordem cronológica decrescente (mais recentes no topo), com datas e horários detalhados nos cards, links diretos para a Ficha 360° e Central de Aprovações, barra de rolagem lateral e ação "Ler todas" que limpa o badge preservando a consulta na lista.
- **Hierarquia por Fornecedor (Drill-down):** Fornecedores exibidos pelo **Apelido (Nome Usual)** como título principal, status operacional interativo (**ATIVO / ENCERRADO**), alerta preventivo discreto de vencimento próximo (60 dias), métricas de **Contratos Ativos**, **Desembolso Mensal** e **Desembolso Anual**, além de perfil formal (Razão Social, Nome Fantasia, CNPJ, Contatos e Pasta no Drive) expandido.
- **Cálculo de Desembolso Anual:** Exibido no cabeçalho de cada parceiro e na tabela de contratos individuais, projetando o custo anual do contrato (Valor Mensal x 12).
- **Estrutura por 5 Gerências:** A pasta raiz no Google Drive contém exclusivamente as 5 pastas setoriais da Telefonia (*GESTAO TELEFONIA*, *OPERACAO E MANUTENCAO DE REDES*, *OPERACOES DE REDES*, *PROJETOS DE IMPLANTACAO* e *TELEFONIA*). No formulário de Novo Fornecedor, o campo Setor define em qual gerência a pasta daquele parceiro será criada.
- **Controle de Acessos Dinâmico e Limpeza de Planilha:** Mapeamento dinâmico de cabeçalhos na aba `Acessos_Alcadas` (compatível com ou sem coluna 'ID do Usuário') e rotina de exclusão de abas residuais (`Página2` e `Página3`).
- **Designação de Substituto Temporário durante Ausência:** Permite ao gestor designar um substituto temporário por período determinado ou indeterminado, delegando alçadas formais de aprovação.
- **Alertas de Reajuste Periódico de Valor (5 Dias Antes):** Banner de alerta executivo notificando gestores e o setor Administrativo 5 dias antes de repactuações periódicas de valor.
- **E-mail do Responsável pelo Contrato:** Campo obrigatório no Módulo 1 do cadastro contratual, armazenado na planilha e integrado a alertas e governança.
- **Controle de Logs por Contrato (Ficha 360°):** Histórico individual e imutável de alterações em cada contrato.
- **Log de Alterações em Linha do Tempo Acordeon:** Central de monitoramento com timeline executiva, botão unificado **Expandir / Recolher Todos**, filtros multidimensionais por Gerência, Fornecedor e Contrato, e política estrita de privacidade onde cada gestor acessa unicamente as suas próprias alterações (e do seu substituto/titular), cabendo exclusivamente à Gestão Telefonia (Administrativo) o acesso global irrestrito.
- **Alteração Contratual Direta pelo Responsável:** Modal interativo de edição onde o responsável altera valores, serviços, prazos e condições diretamente no contrato, gravando a atualização na base e o registro imutável na trilha de auditoria.
- **Multiplicador de Serviços & Período de Cobrança Efetiva:** Cálculo de Valor Mensal Total por Quantidade de Serviços x Valor Unitário, e definição de meses de cobrança ativa no ano (ex: 9 meses em contratos de 12 meses) com cálculo proporcional exato do Desembolso Anual.
- **Padronização de 4 Subpastas no Google Drive:** Criação automática das subpastas `Contrato`, `Anexos`, `Documentação` e `NF` para cada contrato, com seletor de pasta de destino nos formulários.
- **- **Base Oficial de Contratos (52 Colunas):** Linha 1 de cabeçalho da aba Contratos formatada com títulos oficiais amigáveis correspondentes a todos os campos corporativos, incluindo multiplicador de serviços, meses de cobrança efetiva, pasta de destino no Drive e condições de pagamento plurianual (forma de pagamento, quantidade de parcelas e valor por parcela).
- **Interface Otimizada de Contratos:** Remoção da coluna redundante de Protocolo na listagem principal de contratos do fornecedor para despoluir a visualização e priorizar as informações financeiras e de vigência.
- **Faixas de Assinantes com Opção "Acima de":** Permite definir faixas abertas sem teto superior (ex: acima de 500.000 clientes) onde o valor se mantém estável a partir de determinado patamar.
- **Contratos Plurianuais com Condições de Pagamento e Parcelamento:** Suporte a contratos pagos a cada 5 anos ou mais, com definição da forma de pagamento (Parcela Única, Mensal, Semestral ou Anual), quantidade de parcelas e cálculo automático do valor por parcela, sem distorcer o desembolso anual nos anos sem faturamento.
- **Tabela de Faixas por Base de Clientes:** Seleção de faixa em vigor com radio button ("bolinha") e atualização dinâmica.
- **Governança de Mudanças (Central de Aprovações):** Contratos cadastrados nascem ativos e validados. A esteira de aprovações é reservada para alterações de escopo, renovações, reajustes extraordinários e migração de faixas.
- **Identidade Visual brisanet:** Aplicação estrita da paleta oficial (#FF5022, #2242D4, #0B316D, etc.), fontes Figtree/Rubik, "a brisanet" no feminino e ausência total de emojis.

---

## Estrutura dos Arquivos
- `Code.gs`: Backend em Google Apps Script gerenciando Google Sheets relacional (52 colunas na aba Contratos e 10 colunas em Acessos_Alcadas), Google Drive, disparo de e-mails formais e trilha de auditoria.
- `Index.html`: Frontend responsivo em HTML5, CSS3 e JavaScript nativo com modais com cantos arredondados (16px), acordeão de fornecedores, máscaras de preenchimento, Ficha 360°, banner de alertas e Log de Alterações em acordeão por contrato com linha do tempo executiva.
- `MANUAL_DO_USUARIO.md`: Guia detalhado passo a passo de operação para os colaboradores.
