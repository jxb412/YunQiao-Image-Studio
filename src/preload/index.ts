import { contextBridge, ipcRenderer } from "electron";

import type { ImageEditRequest, ImageGenerationRequest } from "../shared/imageApiTypes";

contextBridge.exposeInMainWorld("yunqiao", {
  setApiKey: (apiKey: string) => ipcRenderer.invoke("settings:set-api-key", apiKey),
  generateImage: (request: ImageGenerationRequest) => ipcRenderer.invoke("image:generate", request),
  editImage: (request: ImageEditRequest) => ipcRenderer.invoke("image:edit", request),
  testApi: () => ipcRenderer.invoke("api:test"),
  testProxy: (patch: { proxyMode?: string; proxyUrl?: string }) => ipcRenderer.invoke("network:test-proxy", patch),
  getSettings: () => ipcRenderer.invoke("app:get-settings"),
  checkUpdate: () => ipcRenderer.invoke("app:check-update"),
  updateSettings: (patch: Record<string, unknown>) => ipcRenderer.invoke("settings:update", patch),
  chooseDirectory: () => ipcRenderer.invoke("dialog:choose-directory"),
  chooseImages: () => ipcRenderer.invoke("dialog:choose-images"),
  chooseImageFolder: () => ipcRenderer.invoke("dialog:choose-image-folder"),
  openDirectory: (directory?: string) => ipcRenderer.invoke("file:open-directory", directory),
  openFileLocation: (filePath: string) => ipcRenderer.invoke("file:open-location", filePath),
  copyImage: (dataUrl: string) => ipcRenderer.invoke("clipboard:copy-image", dataUrl),
  saveImage: (payload: { dataUrl: string; name: string }) => ipcRenderer.invoke("assets:save-image", payload),
  saveTempImage: (payload: { dataUrl: string; name: string }) => ipcRenderer.invoke("assets:save-temp-image", payload),
  getAssetLibrary: () => ipcRenderer.invoke("assets:get-library"),
  saveAssetLibrary: (assets: unknown[]) => ipcRenderer.invoke("assets:save-library", assets),
  getCustomTemplates: () => ipcRenderer.invoke("templates:get-custom"),
  saveCustomTemplates: (templates: unknown[]) => ipcRenderer.invoke("templates:save-custom", templates),
  exportTemplates: (templates: unknown[]) => ipcRenderer.invoke("templates:export", templates),
  importTemplates: () => ipcRenderer.invoke("templates:import"),
  uploadAsset: (asset: { name: string; project?: string; source?: string; localPath?: string }) => ipcRenderer.invoke("assets:upload", asset),
  exportUrlList: (assets: Array<{ name: string; cloudUrl: string }>) => ipcRenderer.invoke("assets:export-url-list", assets),
  createAssetZip: (assets: Array<{ name: string; prompt: string; cloudUrl: string; localPath?: string }>) => ipcRenderer.invoke("assets:create-zip", assets),
  importBatchExcel: () => ipcRenderer.invoke("batch:import-excel"),
  exportBatchTemplate: () => ipcRenderer.invoke("batch:export-template"),
  exportBatchLog: (tasks: unknown[]) => ipcRenderer.invoke("batch:export-log", tasks),
  testStorage: (payload: { type: string; endpoint?: string; host?: string; port?: string }) => ipcRenderer.invoke("storage:test", payload),
  testStorageUpload: (profile: unknown) => ipcRenderer.invoke("storage:test-upload", profile),
  openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url)
});
