import { contextBridge, ipcRenderer } from "electron";

import type { ImageEditRequest, ImageGenerationRequest } from "../shared/imageApiTypes";

contextBridge.exposeInMainWorld("yunqiao", {
  setApiKey: (apiKey: string) => ipcRenderer.invoke("settings:set-api-key", apiKey),
  generateImage: (request: ImageGenerationRequest) => ipcRenderer.invoke("image:generate", request),
  editImage: (request: ImageEditRequest) => ipcRenderer.invoke("image:edit", request),
  getSettings: () => ipcRenderer.invoke("app:get-settings"),
  updateSettings: (patch: Record<string, unknown>) => ipcRenderer.invoke("settings:update", patch),
  chooseDirectory: () => ipcRenderer.invoke("dialog:choose-directory"),
  chooseImages: () => ipcRenderer.invoke("dialog:choose-images"),
  openDirectory: (directory?: string) => ipcRenderer.invoke("file:open-directory", directory),
  saveImage: (payload: { dataUrl: string; name: string }) => ipcRenderer.invoke("assets:save-image", payload),
  getAssetLibrary: () => ipcRenderer.invoke("assets:get-library"),
  saveAssetLibrary: (assets: unknown[]) => ipcRenderer.invoke("assets:save-library", assets),
  getCustomTemplates: () => ipcRenderer.invoke("templates:get-custom"),
  saveCustomTemplates: (templates: unknown[]) => ipcRenderer.invoke("templates:save-custom", templates),
  uploadAsset: (asset: { name: string; project?: string; source?: string; localPath?: string }) => ipcRenderer.invoke("assets:upload", asset),
  exportUrlList: (assets: Array<{ name: string; cloudUrl: string }>) => ipcRenderer.invoke("assets:export-url-list", assets),
  createAssetZip: (assets: Array<{ name: string; prompt: string; cloudUrl: string; localPath?: string }>) => ipcRenderer.invoke("assets:create-zip", assets),
  importBatchExcel: () => ipcRenderer.invoke("batch:import-excel"),
  testStorage: (payload: { type: string; endpoint?: string; host?: string; port?: string }) => ipcRenderer.invoke("storage:test", payload),
  openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url)
});
