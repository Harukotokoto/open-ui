//! アプリ全体で共有する状態。Tauriの `State` として各コマンドに渡す。

use std::path::PathBuf;
use std::sync::Arc;

use open_ui_core::api::ApiClient;
use open_ui_core::error::AppError;
use open_ui_core::history::HistoryStore;
use open_ui_core::profiles::ProfileService;
use open_ui_core::secrets::KeyringStore;
use open_ui_core::settings::SettingsStore;

pub struct AppState {
    pub api: ApiClient,
    pub profiles: Arc<ProfileService>,
    /// 設定ファイル。プロファイルと画面の設定が同じファイルなので、`profiles` と共有する
    pub settings: Arc<SettingsStore>,
    /// チャット履歴(`<データディレクトリ>/history/<id>.json`)
    pub history: Arc<HistoryStore>,
}

impl AppState {
    /// `data_dir` はアプリのデータディレクトリ。
    pub fn new(data_dir: PathBuf) -> Result<Self, AppError> {
        let history = Arc::new(HistoryStore::new(data_dir.join("history")));
        let settings = Arc::new(SettingsStore::new(data_dir));
        Ok(Self {
            history,
            api: ApiClient::new()?,
            profiles: Arc::new(ProfileService::new(
                settings.clone(),
                Arc::new(KeyringStore),
            )),
            settings,
        })
    }
}

/// ファイルやOSの資格情報ストアを触る同期の処理を、非同期ランタイムを塞がない別スレッドで実行する。
/// (Secret Service がロック解除を待つなど、時間がかかることがある。)
pub async fn blocking<T, F>(work: F) -> Result<T, AppError>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, AppError> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|e| AppError::internal(format!("内部エラーが発生しました: {e}")))?
}
