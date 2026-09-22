import React, { useState, useMemo } from 'react';
import { 
  X, ShieldCheck, Search, Filter, Clock, 
  ArrowRight, CheckCircle2, AlertTriangle, 
  Trash2, PlusCircle, RefreshCw, Download
} from 'lucide-react';
import type { AuditLogEntry, AuditAction } from '../types/governance';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('TODOS');
  const [selectedEntity, setSelectedEntity] = useState<string>('TODOS');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.justification && log.justification.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction = selectedAction === 'TODOS' || log.action === selectedAction;
      const matchesEntity = selectedEntity === 'TODOS' || log.entity === selectedEntity;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [logs, searchTerm, selectedAction, selectedEntity]);

  if (!isOpen) return null;

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'CRIACAO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><PlusCircle className="w-3 h-3" /> Criação</span>;
      case 'EXCLUSAO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200"><Trash2 className="w-3 h-3" /> Exclusão</span>;
      case 'EDICAO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"><RefreshCw className="w-3 h-3" /> Edição</span>;
      case 'REMANEJAMENTO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200"><ArrowRight className="w-3 h-3" /> Remanejamento</span>;
      case 'CONTESTACAO_ANATEL':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"><AlertTriangle className="w-3 h-3" /> Glosa Anatel</span>;
      case 'IMPORTACAO_ARQUIVO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200"><Download className="w-3 h-3" /> Importação</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{action}</span>;
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trilha_auditoria_orcahub_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Trilha de Auditoria & Governança (Audit Trail)</h2>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-indigo-200">
                  Compliance SOX / FP&A
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Registro cronológico e imutável de todas as modificações, exclusões e aprovações no OrçaHub.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              title="Exportar trilha em JSON"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Log
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por usuário, protocolo, descrição ou justificativa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Ação:</span>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="text-xs font-medium text-slate-700 border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TODOS">Todas as Ações</option>
                <option value="CRIACAO">Criação</option>
                <option value="EXCLUSAO">Exclusão</option>
                <option value="EDICAO">Edição</option>
                <option value="REMANEJAMENTO">Remanejamento</option>
                <option value="CONTESTACAO_ANATEL">Glosa Anatel</option>
                <option value="IMPORTACAO_ARQUIVO">Importação</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Entidade:</span>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="text-xs font-medium text-slate-700 border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TODOS">Todas</option>
                <option value="OPEX">OPEX</option>
                <option value="DETRAF">DETRAF</option>
                <option value="CAPEX">CAPEX</option>
                <option value="CONTRATO">CONTRATO</option>
                <option value="FLUXO_CAIXA">FLUXO DE CAIXA</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Timeline / Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-sm">Nenhum evento registrado com os filtros selecionados</p>
              <p className="text-xs text-slate-500">Ajuste os filtros ou o termo de busca para visualizar os registros.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all duration-150 flex flex-col md:flex-row gap-4 justify-between"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getActionBadge(log.action)}
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
                        {log.entity} #{log.entityId}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {log.timestamp}
                      </span>
                      {log.ipAddress && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          (IP: {log.ipAddress})
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-800">
                      {log.description}
                    </p>

                    {(log.previousValue !== undefined || log.newValue !== undefined) && (
                      <div className="flex items-center gap-2 text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 w-fit">
                        {log.previousValue !== undefined && (
                          <span className="text-rose-600 line-through">
                            {log.previousValue}
                          </span>
                        )}
                        {log.previousValue !== undefined && log.newValue !== undefined && (
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        )}
                        {log.newValue !== undefined && (
                          <span className="text-emerald-700 font-semibold">
                            {log.newValue}
                          </span>
                        )}
                      </div>
                    )}

                    {log.justification && (
                      <div className="text-xs text-slate-600 bg-amber-50/50 border border-amber-200/60 rounded-lg px-3 py-1.5 mt-1">
                        <span className="font-semibold text-amber-900">Justificativa: </span>
                        {log.justification}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col justify-between items-end shrink-0 text-right">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                        {log.user.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{log.user}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">
                      ID: {log.id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Trilha assinada com hash de integridade SHA-256 e controle de concorrência.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-900 transition-colors shadow-sm"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
