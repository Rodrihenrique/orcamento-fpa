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
Três planilhas + Drive. O sistema **se adapta ao modelo das originais** (sem identidade visual brisanet nelas).
- **Controle de DETRAF BRISANET 3.0** (original): só a aba `Controle - DETRAF E DEROAM`, só colunas `I` (Detraf brisanet, a receber, positivo) e `J` (Detraf relacionada, a pagar, negativo), só em linhas que **já existem**. Nunca cria linha/bloco/aba; E, F, K, L, Q, S, T e demais colunas não são tocadas.
- **DETRAF Devedor - AAAA** (original): aba `AAAAMM`, blocos de RECEBIMENTO (`OPERADORA TIPO - BRISANET TIPO`). Cada bloco é reescrito a partir do detalhe ativo do sistema (linhas de dados + `=SUM` no total). Bloco que o sistema não toca fica intacto. Bloco inexistente é criado no fim da aba (cores observadas da planilha); aba do mês inexistente é criada em branco. Roaming fora do escopo.
- **Planilha do sistema** (`ID_PLANILHA_DETALHE`; crie uma vazia): abas `Lancamentos` (histórico versionado), `Log` e `AAAAMM` (detalhe completo com Bloco, Lote, Versão, Status = fonte da verdade, também do que não tem destino original, como EMISSAO).
- **Drive**: `Originais/AAAAMM/<hash8>_<nome>` com o arquivo original intacto.

## Convenções
- `Lancamentos`: uma linha por grupo aprovado. Status `ATIVO` → `SUBSTITUIDO` (nova versão) ou `ESTORNADO`. Nunca apaga linha.
- Chave única: `AAAAMM|tipoBrisanet|tipoParceiro|holding|direcao`. Idempotência: SHA-256 do arquivo original.
- Controle: a conferência **simula** a gravação (`Controle_planejar`). Bloco/linha ausente = erro (bloqueia). Célula com valor que não veio do sistema (digitado à mão) = aviso "li e aceito" antes de sobrescrever. Período digitado errado na coluna G (ex.: `2026011`) é reconhecido por ano + nome do mês, com aviso. Fórmula do usuário é preservada se o valor não muda.
- Devedor: bloco reconhecido por operadora + tipo da relacionada (quando o título tem) + tipo brisanet; "TIM SA - BRISANET SMP" (sem tipo) aceita qualquer tipo exceto SMS.
- Estorno: marca `ESTORNADO` em Lancamentos e detalhe; Controle volta à soma dos lançamentos ainda ATIVOS só se a célula ainda vale o que o sistema gravou; blocos do Devedor são reescritos sem as linhas estornadas.
- Dinheiro em centavos inteiros no cálculo; fuso `America/Sao_Paulo`.

## Testes
- `node tests/run.cjs` — Modelo, Parsers (CSV, Vivo, SURF, OI, XLS), CT, Cálculo, Validação.
- `node tests/persistencia.cjs` — Persistência, Controle e Devedor contra planilhas simuladas em memória.
- `node tests/relatorios.cjs` — Dashboard e Consulta.
Dados de teste são sintéticos (nenhum arquivo de operadora é versionado).
**Não testado ainda:** Apps Script de verdade (SpreadsheetApp/DriveApp), pdf.js dentro do HtmlService, limite de upload, tela no navegador.

## Limites conhecidos desta versão
- Anexo 5: layout não verificado por falta de acesso na época; há trava (<50 EOTs lidas = erro) e `GID_ABA_EOT`.
- Controle: coluna F (data) e K/L (B&K) não são escritas. O bloco do mês precisa existir no Controle.
- Devedor: formatação de blocos novos reproduz o observado, ainda não testada na planilha real; rótulos de operadora (linha da coluna I) não são criados.
- Estorno não reativa a versão anterior.

## O que ainda falta (e depende de decisão)
- Processamento em blocos (limite de ~6 min) e limite real de upload: testar com o OI de ~5,5 mil linhas e o XLS de 2 MB.
- Integração com NF/Jira, DADOS PARA FATURAMENTO, Provisão e Pendências do Controle 3.0.
