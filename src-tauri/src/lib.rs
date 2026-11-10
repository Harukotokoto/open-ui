pub mod bindings;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = bindings::builder();

    #[cfg(debug_assertions)]
    if let Err(error) = bindings::export(&builder) {
        eprintln!("TypeScript の型を書き出せませんでした: {error}");
    }

    tauri::Builder::default()
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("アプリの起動に失敗しました");
}
