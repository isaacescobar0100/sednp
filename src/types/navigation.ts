export type ModuleKey =
  | 'dashboard'
  | 'afiliacion'
  | 'financiero'
  | 'gobernanza'
  | 'disciplinario'
  | 'comites'
  | 'comunicaciones'
  | 'documental'
  | 'reportes'
  | 'parametros'

export type ModuleMeta = {
  key: ModuleKey
  label: string
  subtitle: string
}
