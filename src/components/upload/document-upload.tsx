"use client";

import * as React from "react";
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface UploadedFileItem {
  id: string;
  name: string;
  sizeLabel: string;
  kind: "pdf" | "image" | "sheet" | "other";
}

const FILE_ICON_MAP: Record<UploadedFileItem["kind"], typeof FileIcon> = {
  pdf: FileText,
  image: FileImage,
  sheet: FileSpreadsheet,
  other: FileIcon,
};

const FILE_ICON_COLOR_MAP: Record<UploadedFileItem["kind"], string> = {
  pdf: "text-destructive bg-destructive/10",
  image: "text-primary bg-accent",
  sheet: "text-success bg-success/10",
  other: "text-muted-foreground bg-muted",
};

interface DocumentUploadProps {
  files: UploadedFileItem[];
  onRemove: (id: string) => void;
  isDragging: boolean;
  onDragStateChange: (isDragging: boolean) => void;
}

/**
 * Interface de upload por arrastar e soltar. Não realiza upload real —
 * apenas simula o estado visual de arrastar e a lista de arquivos.
 * A integração com storage de documentos será conectada futuramente.
 */
export function DocumentUpload({
  files,
  onRemove,
  isDragging,
  onDragStateChange,
}: DocumentUploadProps) {
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragStateChange(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragStateChange(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragStateChange(false);
    // Sem funcionamento: esta tela apenas valida a interface visual.
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-accent"
            : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary/60"
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background shadow-card-sm">
          <UploadCloud className="h-5 w-5 text-primary" strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            Arraste arquivos para esta área ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DWG, XLSX ou imagens — tamanho máximo de 25 MB por arquivo
          </p>
        </div>
        <Button type="button" variant="outline" size="sm">
          Selecionar arquivos
        </Button>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file) => {
            const Icon = FILE_ICON_MAP[file.kind];
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-md border border-border bg-background px-3.5 py-2.5"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                    FILE_ICON_COLOR_MAP[file.kind]
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{file.sizeLabel}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(file.id)}
                  aria-label={`Remover ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
