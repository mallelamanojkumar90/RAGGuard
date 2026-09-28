import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  X, 
  Layers, 
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import type { DocumentItem, DocumentChunk, DocumentStatus } from '../types';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Chunk inspection modal state
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [selectedChunks, setSelectedChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState<boolean>(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
    } catch (err: unknown) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files (.pdf) are supported.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await api.uploadDocument(file);
      setUploadSuccess(`Successfully ingested "${res.document.filename}" (${res.document.chunk_count} chunks indexed).`);
      await loadDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}" and purge all its vectors from ChromaDB?`)) {
      return;
    }

    try {
      await api.deleteDocument(docId);
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
      await loadDocuments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  const handleInspectChunks = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const res = await api.getDocument(doc.id);
      setSelectedChunks(res.chunks);
    } catch (err: unknown) {
      console.error('Failed to fetch chunks:', err);
      setSelectedChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'Indexed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 border border-emerald-700/60 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Indexed
          </span>
        );
      case 'Processing':
      case 'Uploading':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-950/60 border border-indigo-700/60 text-indigo-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            {status}
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/60 border border-rose-700/60 text-rose-400">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone Card */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="bg-slate-900/60 border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-2xl p-8 text-center backdrop-blur-sm transition-all duration-200"
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-950/50 border border-indigo-700/40 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            {isUploading ? (
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-100">
            {isUploading ? 'Extracting, Chunking & Embedding...' : 'Upload PDF Knowledge Document'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Drag and drop your PDF here, or click below to select a file from your system.
          </p>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUploading ? 'Processing Document...' : 'Browse PDF File'}
          </button>

          {/* Feedback messages */}
          {uploadError && (
            <div className="mt-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Indexed Knowledge Documents</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Source documents chunked and indexed into ChromaDB for similarity retrieval
            </p>
          </div>
          <button
            onClick={loadDocuments}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-slate-200">No documents indexed yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Upload your first PDF above to initialize the vector database for RAG retrieval.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Chunks Indexed</th>
                  <th className="py-3 px-4">Uploaded At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-200 font-medium flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {formatFileSize(doc.file_size_bytes)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      <span className="font-semibold text-indigo-300">{doc.chunk_count}</span> chunks
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(doc.uploaded_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleInspectChunks(doc)}
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                        title="Inspect extracted chunks"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Chunks
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium cursor-pointer ml-3"
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chunk Inspection Modal / Drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <span>{selectedDoc.filename}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 font-mono text-indigo-300">
                      {selectedDoc.chunk_count} Chunks
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Extracted chunk segments stored in vector index</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Chunks List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingChunks ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  Loading chunk vector payloads...
                </div>
              ) : selectedChunks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No chunks found for this document.
                </div>
              ) : (
                selectedChunks.map((chunk) => (
                  <div
                    key={chunk.chunk_id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-300">Chunk #{chunk.chunk_index + 1}</span>
                        <span>•</span>
                        <span>Page {chunk.page_number}</span>
                      </div>
                      <span className="font-mono text-slate-500">{chunk.character_count} chars</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {chunk.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
