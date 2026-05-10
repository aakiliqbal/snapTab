type BackupSettingsSectionProps = {
  backupMessage: string | null;
  exportBackup: () => void;
  importBackup: (file: File | null) => void;
};

export function BackupSettingsSection({
  backupMessage,
  exportBackup,
  importBackup
}: BackupSettingsSectionProps) {
  return (
    <section className="settings-group">
      <h2>Backup</h2>
      <div className="settings-action-row">
        <button className="launcher-action" type="button" onClick={exportBackup} aria-label="Export JSON backup">
          Export
        </button>
        <label className="upload-button" aria-label="Import JSON backup">
          Import
          <input
            accept="application/json,.json"
            type="file"
            onChange={(event) => {
              importBackup(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {backupMessage ? <p className="launcher-message">{backupMessage}</p> : null}
    </section>
  );
}
