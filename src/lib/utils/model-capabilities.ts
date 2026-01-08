import type { Model } from "@openrouter/sdk/models";

export type ModelCapabilities = {
  supportsImages: boolean;
  supportsFiles: boolean;
  supportsPdf: boolean;
  supportsNativePdf: boolean;
  supportsSearch: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
};

/*
* Model Capabilities
*
* supportsImages: The model can support image uploads / vision content.
* supportsFiles: The model can support general file uploads, including text files and PDFs.
* supportsPdf: OpenRouter handles PDF content for the model (via conversion).
* supportsNativePdf: The model can natively handle PDF content without conversion, and tokens are used.
* supportsSearch: The model can utilize search or retrieval tools.
* supportsTools: The model can utilize external tools.
* supportsReasoning: The model has reasoning capabilities.
*
* We should handle this as so:
* - Image Support: If supportsImages is true, allow image uploads.
* - PDF Support:
*   - If supportsPdf or supportsNativePdf is true, allow PDF uploads.
* - Text File Support:
*   - If supportsFiles is true, allow straight text file uploads.
*   - If supportsFiles is false, extract text from the text files, and treat them as part of the message content.
*     From the user's perspective, it should still look like a regular file upload, but we avoid sending the file directly to the model.
* - Search and Tools:
*  - If supportsSearch or supportsTools is true, enable search and tool functionalities.
* - Reasoning:
* - If supportsReasoning is true, enable reasoning features. TODO: Implement this
*/

export function getModelCapabilities(model: Model | undefined): ModelCapabilities {
  if (!model) {
    return {
      supportsImages: false,
      supportsFiles: false,
      supportsPdf: false,
      supportsNativePdf: false,
      supportsSearch: false,
      supportsTools: false,
      supportsReasoning: false,
    };
  }

  const inputModalities = model.architecture.inputModalities;
  const supportedParams = model.supportedParameters;

  const contextLength = model.contextLength || 0;

  console.log(model);

  const supportsImages = inputModalities.includes("image");
  const supportsFiles = inputModalities.includes("file");
  const supportsTools = supportedParams.includes("tools");
  const supportsSearch = supportsTools && contextLength > 32000; // arbitrary threshold for search support
  const supportsReasoning = supportedParams.includes("reasoning");

  return {
    supportsImages,
    supportsFiles,
    supportsPdf: contextLength > 16000, // arbitrary threshold for PDF support
    supportsNativePdf: supportsFiles,
    supportsSearch,
    supportsTools,
    supportsReasoning,
  };
}

export function getAcceptedFileTypes(capabilities: ModelCapabilities): string {
  const types: string[] = [];

  if (capabilities.supportsImages) {
    types.push("image/*");
  }

  // Plain text files are always supported (via extraction fallback)
  types.push("text/plain", ".md", ".txt", ".json", ".csv");

  if (capabilities.supportsFiles) {
    types.push("text/*");
  }

  if (capabilities.supportsPdf || capabilities.supportsNativePdf) {
    types.push("application/pdf");
    types.push(".pdf");
  }

  return Array.from(new Set(types)).join(",");
}

export function canUploadFiles(capabilities: ModelCapabilities): boolean {
  return capabilities.supportsFiles
    || capabilities.supportsImages
    || capabilities.supportsPdf
    || capabilities.supportsNativePdf;
}

export type FileValidationResult = {
  valid: File[];
  invalid: { file: File; reason: string }[];
};

export function validateFilesForModel(
  files: File[],
  capabilities: ModelCapabilities,
): FileValidationResult {
  const valid: File[] = [];
  const invalid: { file: File; reason: string }[] = [];

  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    // Broaden text detection for extraction purposes
    const isText = file.type.startsWith("text/")
      || file.type === "application/json"
      || file.name.endsWith(".md")
      || file.name.endsWith(".txt")
      || file.name.endsWith(".json")
      || file.name.endsWith(".csv");

    if (isPdf) {
      if (capabilities.supportsPdf || capabilities.supportsNativePdf) {
        valid.push(file);
      }
      else {
        invalid.push({ file, reason: "Model does not support PDF uploads" });
      }
    }
    else if (isImage) {
      if (capabilities.supportsImages) {
        valid.push(file);
      }
      else {
        invalid.push({ file, reason: "Model does not support image uploads" });
      }
    }
    else if (isText) {
      // Text files are always valid.
      // If capabilities.supportsFiles is false, we'll extract text on the server.
      valid.push(file);
    }
    else {
      // Other generic files (that aren't strictly text or handled above)
      if (capabilities.supportsFiles) {
        valid.push(file);
      }
      else {
        invalid.push({ file, reason: "Model does not support this file type" });
      }
    }
  }

  return { valid, invalid };
}
