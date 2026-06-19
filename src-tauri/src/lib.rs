// Backend Tauri mínimo: toda a limpeza acontece no webview (WASM/JS).
// Aqui só registramos os plugins nativos de diálogo e sistema de arquivos,
// usados para salvar/compartilhar o arquivo limpo no desktop e no Android.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o aplicativo Limpador");
}
