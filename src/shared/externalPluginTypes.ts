export interface ExternalPluginManifest {
  id: string
  name: string
  description: string
  version: string
  order: number
  defaultInstalled?: boolean
}

export interface ExternalPluginPayload {
  manifest: ExternalPluginManifest
  rendererCode: string
}
