# 🚗 Guia de Ativação: Automação de Abastecimento e Custos de Frotas

Este guia contém o passo a passo completo para ativar a automação de importação de extratos de faturamento de combustível (Ticket Log / `RFCV_*.csv`) e manutenção dos veículos da frota do setor **OPERAÇÃO E MANUTENÇÃO DE REDES**.

---

## 📋 Visão Geral da Automação

```
[Google Drive: Pasta de Origem]
         │ (Upload de arquivos CSV: RFCV_201597_...csv)
         ▼
[Script: automacao-abastecimento-frotas]
   ├── 1. Detecta delimitador (, ou ;)
   ├── 2. Extrai: Nome Motorista, Valor Emissão, Data/Hora
   ├── 3. Valida contra a Base de Colaboradores Telefonia
   └── 4. Determina Período (ex.: OUTUBRO)
         │
         ├──► [Planilha: 10. CUSTOS DO SETOR - OUTUBRO - 2026]
         │       └─ Aba: Base_Abastecimento (Colunas A, B, C, D)
         │
         └──► [Google Drive: Pasta Processados]
                 └─ (Move o arquivo processado para evitar duplicidade)
```

---

## 🛠️ Passo 1: Onde Criar o Projeto no Apps Script

Você pode implementar esta automação de duas maneiras:

### Opção A (Recomendada): Vinculado à Planilha de Outubro
1. Abra a planilha **`10. CUSTOS DO SETOR - OUTUBRO - 2026`** no Google Sheets.
2. No menu superior, clique em **Extensões** > **Apps Script**.
3. O editor do Google Apps Script será aberto já vinculado a essa planilha.

### Opção B: Projeto Independente no Google Drive
1. Acesse o seu [Google Drive](https://drive.google.com).
2. Clique em **Novo** > **Mais** > **Google Apps Script**.
3. Nomeie o projeto como: `Automação - Abastecimento e Frota 2026`.

---

## 📝 Passo 2: Configurar os Arquivos do Projeto

### 1. Criar o Arquivo de Código (`Codigo.js` ou `Codigo.gs`)
1. No editor do Apps Script, renomeie o arquivo padrão `Código.gs` para `Codigo.js` (ou mantenha `Codigo.gs`).
2. Apague todo o conteúdo padrão existente.
3. Copie o conteúdo completo do arquivo [`Codigo.js`](./Codigo.js) deste repositório e cole no editor.

### 2. Configurar o Manifesto (`appsscript.json`)
1. No menu lateral esquerdo do Apps Script, clique no ícone de engrenagem **Configurações do Projeto** (⚙️).
2. Marque a caixa de seleção: **"Mostrar o arquivo de manifesto 'appsscript.json' no editor"**.
3. Volte para a aba **Editor** (< >) e selecione o arquivo `appsscript.json`.
4. Substitua o conteúdo pelo conteúdo do [`appsscript.json`](./appsscript.json) deste repositório:
```json
{
  "timeZone": "America/Fortaleza",
  "dependencies": {
    "enabledAdvancedServices": []
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```
5. Clique no ícone de **Salvar** (💾).

---

## ⚙️ Passo 3: Ajustar os Parâmetros em `CONFIG_FROTA`

No topo do arquivo `Codigo.js`, localize o bloco `CONFIG_FROTA` e confira os valores:

```javascript
const CONFIG_FROTA = {
  // Pastas de Abastecimento (Drive)
  PASTA_ORIGEM_ABASTECIMENTO: '1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs',      // Onde o CSV é colocado
  PASTA_PROCESSADOS_ABASTECIMENTO: '1FNAHGP3n2FZzIDC_NphwkG26G1CrQL0F', // Para onde o CSV vai

  // Planilha de Destino Mensal
  ID_PLANILHA_DESTINO: '', // (Opcional) Cole o ID da planilha de Outubro aqui
  NOME_PLANILHA_DESTINO: '10. CUSTOS DO SETOR - OUTUBRO - 2026',
  
  // Nomes das abas
  ABA_DESTINO_ABASTECIMENTO: 'Base_Abastecimento',
  
  // Base de Colaboradores
  FILTRAR_POR_COLABORADORES: true,
  ID_PLANILHA_COLABORADORES: '1PtqV_ief0ygTXyKXYAy9hrF6uHEHWYCB37TyceDVk0o',
  ABA_COLABORADORES: 'BASE COLABORADORES TELFONIA',

  // Limpeza de modelo
  LIMPAR_DADOS_EXISTENTES: false
};
```

### 💡 Dicas Importantes de Configuração:
1. **ID da Planilha de Outubro (Recomendado):**
   - Abra a planilha `10. CUSTOS DO SETOR - OUTUBRO - 2026`.
   - Na barra de endereço do navegador, copie o código entre `/d/` e `/edit`:
     `https://docs.google.com/spreadsheets/d/`**`1PtqV_ief0ygTXyKXYAy9hrF6uHEHWYCB37TyceDVk0o`**`/edit`
   - Cole esse código no campo `ID_PLANILHA_DESTINO: 'SEU_ID_AQUI'`.
   *(Se deixar vazio, o script busca automaticamente pelo nome do arquivo no Drive).*

2. **Limpando Linhas de Exemplo:**
   - Se a aba `Base_Abastecimento` de Outubro foi duplicada com dados de teste/exemplo de Agosto, mude temporariamente para:
     ```javascript
     LIMPAR_DADOS_EXISTENTES: true
     ```
     Na primeira execução, ele apagará os dados antigos da linha 2 em diante e inserirá os dados limpos de Outubro. Depois você pode voltar para `false`.

---

## 🔐 Passo 4: Autorização Inicial de Permissões

Na primeira vez que você executar o script, o Google solicitará permissão de acesso:

1. No menu de seleção de funções no topo do editor, selecione: **`testarConexoes`**.
2. Clique no botão **Executar** (▶️).
3. Uma janela surgirá: **"Autorização necessária"** > Clique em **Revisar permissões**.
4. Selecione a sua conta Google corporativa (`@grupobrisanet.com.br`).
5. Se aparecer a tela *"O Google não verificou este app"*:
   - Clique em **Avançado** (canto inferior esquerdo).
   - Clique em **Acessar [Nome do Projeto] (não seguro)**.
6. Na tela final, clique em **Permitir**.
7. Verifique o log de execução: todas as conexões (Planilha, Pastas e Base de Colaboradores) devem retornar com `✅`.

---

## 🚀 Passo 5: Como Executar a Importação

### Modo 1: Pelo Menu do Google Sheets (Mais Prático)
1. Recarregue a página da planilha no navegador (`F5`).
2. Um novo menu chamado **`🚗 Gestão de Frota`** aparecerá na barra superior.
3. Clique em: **`🚗 Gestão de Frota`** > **`⛽ Importar Abastecimento (Outubro)`**.
4. O script processará todos os arquivos `.csv` da pasta de origem, preencherá a aba `Base_Abastecimento` e exibirá uma caixa de alerta informando a quantidade de registros importados!

### Modo 2: Pelo Editor do Apps Script
1. Selecione a função `importarDadosAbastecimento`.
2. Clique em **Executar** (▶️).
3. Acompanhe os logs em tempo real na parte inferior da tela.

---

## ⏰ Passo 6: Ativar Execução Automática Diária (Opcional)

Se você preferir que o robô faça a leitura automática diariamente sem precisar clicar em nada:

1. Na planilha, clique no menu: **`🚗 Gestão de Frota`** > **`⏰ Ativar Leitura Diária Automática (07:00)`**.
2. Pronto! Todos os dias às 07:00 da manhã (fuso de Fortaleza), qualquer novo arquivo CSV colocado na pasta de combustível será automaticamente importado e arquivado na pasta de processados.

---

## 🔄 Passo 7: Como Atualizar para os Próximos Meses

Quando mudar de mês (ex.: Novembro de 2026):
1. Abra o arquivo `Codigo.js`.
2. Altere apenas a linha correspondente:
   ```javascript
   NOME_PLANILHA_DESTINO: '11. CUSTOS DO SETOR - NOVEMBRO - 2026',
   ID_PLANILHA_DESTINO: 'ID_DA_PLANILHA_DE_NOVEMBRO',
   ```
3. O script passará a alimentar automaticamente a planilha de Novembro!

---

## ❓ Perguntas Frequentes e Resolução de Problemas

| Situação | Causa Provável | Solução |
| :--- | :--- | :--- |
| **"Erro: Planilha não encontrada"** | O nome do arquivo no Drive possui espaço extra ou o script não tem acesso. | Abra a planilha de Outubro, copie o ID da URL e cole em `ID_PLANILHA_DESTINO`. |
| **"Aba Base_Abastecimento não encontrada"** | A aba na planilha tem nome diferente (ex: com espaço ou maiúscula). | Verifique o nome exato da aba e ajuste `ABA_DESTINO_ABASTECIMENTO`. |
| **Motoristas não foram importados** | O nome no CSV não bate com a `BASE COLABORADORES TELFONIA`. | O log exibirá os nomes ignorados. Se quiser importar todos sem filtrar, defina `FILTRAR_POR_COLABORADORES: false`. |
| **Separador de CSV alterado** | O extrato baixado veio separado por `;` em vez de `,`. | O script possui detecção automática de delimitador e trata isso nativamente. |
