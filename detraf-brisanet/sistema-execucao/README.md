# Sistema de execução DETRAF (esboço v0.1)

Núcleo novo, em camadas, que evolui o Auditor (`../auditor-web-app/`) sem alterá-lo.
As regras de padronização, mapa de EOT, agrupamento e direção foram portadas do `Codigo.gs` do Auditor.

```
Upload → detecta formato → parser → regras/cálculo → tela de conferência
       → aprovação → grava Lancamentos + original no Drive → Log
```

| Camada | Arquivo | Toca em planilha/Drive? |
|---|---|---|
| Configuração | `Config.gs` | só Propriedades do Script |
| Modelo padrão | `Modelo.gs` | não |
| Leitura (um parser por formato) | `Parsers.gs` | não |
| Regra de negócio | `Calculo.gs` | não |
| Validação (erro × aviso) | `Validacao.gs` | não |
| Persistência | `Persistencia.gs` | **sim, só na aprovação** |
| Auditoria | `Log.gs` | aba `Log` |
| Interface | `Api.gs`, `Index.html` | via funções acima |

## Como instalar (Apps Script, projeto novo)
1. Crie um projeto e copie os `.gs`, o `Index.html` e o `appsscript.json` (Configurações do projeto → mostrar manifesto).
2. No editor, preencha os valores em `configurarInicial()` **sem commitar os IDs** e rode uma vez:
   `ID_PLANILHA_DESTINO`, `ID_PLANILHA_EOT` (Anexo 5), `ID_PASTA_RAIZ`, `USUARIOS_AUTORIZADOS`.
3. Implante como App da Web, executando como **usuário que acessa**.

## Convenções
- Aba `Lancamentos`: uma linha por grupo aprovado. Status `ATIVO` → `SUBSTITUIDO` (nova versão) ou `ESTORNADO`. Nunca apaga linha.
- Chave única do lançamento: `AAAAMM|tipoBrisanet|tipoParceiro|holding|direcao`.
- Idempotência: SHA-256 do arquivo; hash já `ATIVO` bloqueia a aprovação.
- Originais no Drive: `Originais/AAAAMM/<8 primeiros do hash>_<nome>`.
- Dinheiro em centavos inteiros durante todo o cálculo; fuso `America/Sao_Paulo`.

## Testes
`node tests/run.cjs` — cobre Modelo, Parsers, Calculo e Validacao (dados sintéticos).
Persistência, Drive e tela **não foram testadas**: precisam rodar no Apps Script com planilhas reais.

## O que ainda falta (e depende de decisão)
- Parsers de XLS/XLSX/ZIP (hoje o Auditor converte no navegador) e PDF (confiável só se tiver texto; escaneado exige OCR).
- Conferir total do arquivo × soma das linhas: falta saber onde cada formato traz o total.
- Abas mensais `AAAAMM` da planilha "DETRAF Devedor - 2026" e integração com colunas I/J da planilha de controle.
- Processamento em blocos (limite de ~6 min) e limite real de upload — testar com arquivos reais.
- Estorno: hoje só marca `ESTORNADO`; não reativa a versão anterior automaticamente.
