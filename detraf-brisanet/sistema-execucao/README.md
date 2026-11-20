# Sistema de execução DETRAF (esboço v0.2)

Núcleo em camadas que evolui o Auditor (`../auditor-web-app/`) sem alterá-lo.
Regras de padronização, mapa de EOT, agrupamento e direção foram portadas do `Codigo.gs` do Auditor.

```
Upload → entrada (CSV / ZIP / XLS) → parser → regras/cálculo → conferência
       → aprovação → Lancamentos + detalhe mensal + Controle + original no Drive → Log
```

| Camada | Arquivo | Toca em planilha/Drive? |
|---|---|---|
| Configuração | `Config.gs` | só Propriedades do Script |
| Modelo padrão | `Modelo.gs` | não |
| Entrada (abre ZIP, lê carta RTF) | `Entrada.gs` | não |
| Total da carta CT | `CtTotal.gs` | não |
| Leitura (um parser por formato) | `Parsers.gs` | não |
| Regra de negócio | `Calculo.gs` | não |
| Validação (erro × aviso) | `Validacao.gs` | não |
| Persistência | `Persistencia.gs` | **sim, só na aprovação** |
| Auditoria | `Log.gs` | aba `Log` |
| Interface | `Api.gs`, `Index.html` | via funções acima |

## Formatos suportados (layouts vistos em arquivos reais, set–out/2026)
| Formato | Como entra | Onde está o total declarado |
|---|---|---|
| CSV TIM/SURF (dentro de ZIP) | servidor abre o ZIP | TIM: carta `_CT.pdf` (texto lido no navegador com pdf.js). SURF: linha `tipo_relatorio = 01` do CSV |
| CSV OI (ZIP, sem cabeçalho, 17 col.) | servidor abre o ZIP | carta `CT_ENVIO_*.rtf` (lida no servidor) |
| CSV Vivo (21 col.) | direto | linha `tipo_relatorio = 01` do CSV |
| XLS Claro (abas `DETRAF` + `RESUMO`) | navegador converte com SheetJS | `RESUMO › Total Geral` |

Valor usado em todos: coluna 14 (valor bruto / total). Total declarado conferido contra a soma das linhas.
PDF de detalhamento não tem parser: só apareceram cartas e logs em PDF, e o texto delas é extraído no navegador. PDF escaneado exigiria OCR.

## Planilhas e pastas
- **DETRAF brisanet - Controle**: abas `Controle` (colunas A–AE como no Controle 3.0, com fórmulas em E, Q, S, T), `Lancamentos` e `Log`.
- **DETRAF brisanet - Detalhe mensal**: aba `Modelo` e uma aba `AAAAMM` criada pelo sistema na 1ª aprovação do período (tabela única: 16 colunas padrão + Bloco, Lote, Versão, Status, Arquivo).
- **Drive**: `Originais/AAAAMM/<hash8>_<nome>` com o arquivo original intacto.

## Configuração (Propriedades do Script — nunca no repositório)
`ID_PLANILHA_CONTROLE`, `ID_PLANILHA_DETALHE`, `ID_PLANILHA_EOT` (Anexo 5), `ID_PASTA_ORIGINAIS`, `USUARIOS_AUTORIZADOS` (e-mails separados por vírgula).
Rode `configurarInicial({...})` uma vez no editor e implante como App da Web (executar como o usuário que acessa).

## Convenções
- `Lancamentos`: uma linha por grupo aprovado. Status `ATIVO` → `SUBSTITUIDO` (nova versão) ou `ESTORNADO`. Nunca apaga linha.
- Chave única: `AAAAMM|tipoBrisanet|tipoParceiro|holding|direcao`. Idempotência: SHA-256 do arquivo original.
- Controle: EMISSAO grava em `I` (positivo); RECEBIMENTO grava em `J` (negativo). A linha é criada se não existir (sem o erro "linha não encontrada" do Auditor). Fórmulas digitadas pelo usuário em I/J são preservadas.
- Estorno: marca `ESTORNADO` em Lancamentos e detalhe e zera o Controle só se a célula ainda tiver o valor do lote.
- Dinheiro em centavos inteiros no cálculo; fuso `America/Sao_Paulo`.

## Testes
- `node tests/run.cjs` — Modelo, Parsers (CSV, Vivo, SURF, OI, XLS), CT, Cálculo, Validação.
- `node tests/persistencia.cjs` — Persistência contra planilha simulada em memória.
Dados de teste são sintéticos (nenhum arquivo de operadora é versionado).
**Não testado ainda:** Apps Script de verdade (SpreadsheetApp/DriveApp), pdf.js dentro do HtmlService, limite de upload, tela no navegador.

## O que ainda falta (e depende de decisão)
- Processamento em blocos (limite de ~6 min) e limite real de upload: testar com o OI de ~5,5 mil linhas e o XLS de 2 MB.
- Estorno não reativa a versão anterior (`SUBSTITUIDO`) automaticamente.
- Integração com NF/Jira, DADOS PARA FATURAMENTO, Provisão e Pendências do Controle 3.0.
