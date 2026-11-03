export type ModuleKey =
  | 'dashboard'
  | 'afiliacion'
  | 'financiero'
  | 'gobernanza'
  | 'disciplinario'
  | 'comites'
  | 'comunicaciones'
  | 'pqrs'
  | 'documental'
  | 'libro'
  | 'publicaciones'
  | 'reportes'
  | 'parametros'

export type ModuleMeta = {
  key: ModuleKey
  label: string
  subtitle: string
}
