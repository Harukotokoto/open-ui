pub mod bindings;
mod commands;
mod state;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = bindings::builder();

    tauri::Builder::default()
        // ファイル選択のダイアログは、Rust側のコマンド(`attachment_pick`)からだけ使う。
        // 画面(JS)にはこのプラグインの権限を与えない
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            // 自動更新(GitHub Releases の `latest.json` を見る)と、更新後の再起動
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            // 設定ファイルの置き場所。OSごとのアプリのデータディレクトリ
            let data_dir = app.path().app_data_dir()?;
            let state = state::AppState::new(data_dir)?;
            // 会話が残っていない添付(保存前にアプリが終わった会話など)を、起動を待たせず掃除する
            let attachments = state.attachments.clone();
            tauri::async_runtime::spawn_blocking(move || {
                let _ = attachments.prune_orphans(std::time::SystemTime::now());
            });
            app.manage(state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("アプリの起動に失敗しました");
}
