import type { MachinaSlotProps } from "machinalayout/react";
import { CanvasCommandTerminal } from "../../CanvasCommandTerminal";
import { formatCoordinateProfileSummary, getCoordinateProfile } from "../../coordinateProfiles";
import { getObjectBoundsSummary, summarizeScene } from "../../sceneSummary";
import { summarizeViewport } from "../../viewportSummary";
import {
  commandKindLabels,
  formatChange,
  formatCommandKinds,
  getKindClass,
  getKindShortLabel,
  getObjectLayer,
  getSelectedObject,
  readViewData,
} from "../editor/editorShared";

export function SceneSummaryShelf(props: MachinaSlotProps) {
  const {
    document,
    viewport,
    runCommand,
    commandLog,
    commandLogCollapsed,
    terminalLog,
    terminalCollapsed,
    terminalInput,
    runTerminalCommand,
    setCommandLogCollapsed,
    setTerminalCollapsed,
    setTerminalInput,
  } = readViewData(props);
  const objects = Object.values(document.objects).filter((object) =>
    ["logo", "headline", "generated-product-image", "cta-bg", "feature-chip-1"].includes(object.id),
  );
  const summaryObjects = objects.length > 0 ? objects : Object.values(document.objects).slice(0, 5);
  const recentLog = commandLog.slice(0, 3);
  const coordinateProfile = getCoordinateProfile(document.coordinateProfileId);

  return (
    <section className="scene-summary panel">
      <div className="summary-main">
        <p className="summary-text">{summarizeScene(document)}</p>
        <p className="summary-text viewport-summary-text">
          {summarizeViewport(document, viewport)}
        </p>
        <p className="summary-text viewport-summary-text">
          Coordinates: {formatCoordinateProfileSummary(coordinateProfile)}
        </p>
        <div className="object-card-row">
          {summaryObjects.map((object) => (
            <button
              className={`object-card ${document.selectedObjectId === object.id ? "is-selected" : ""}`}
              key={object.id}
              type="button"
              onClick={() => runCommand({ kind: "select", id: object.id })}
            >
              <span className={`kind-pill ${getKindClass(object)}`}>
                {getKindShortLabel(object)}
              </span>
              <strong>{object.name}</strong>
              <small>{getObjectBoundsSummary(object, document)}</small>
            </button>
          ))}
        </div>
        <CanvasCommandTerminal
          collapsed={terminalCollapsed}
          inputValue={terminalInput}
          log={terminalLog}
          onChangeInput={setTerminalInput}
          onSubmitCommand={runTerminalCommand}
          onToggleCollapsed={() => setTerminalCollapsed(!terminalCollapsed)}
        />
      </div>
      <aside
        className={commandLogCollapsed ? "command-log is-collapsed" : "command-log"}
        aria-label="Command log"
      >
        <header>
          <small>Command log</small>
          <strong>{commandLog.length}</strong>
          <button onClick={() => setCommandLogCollapsed(!commandLogCollapsed)} type="button">
            {commandLogCollapsed ? "Expand" : "Collapse"}
          </button>
        </header>
        {commandLogCollapsed ? (
          <p className="empty-note">Recent command history is hidden while editing.</p>
        ) : recentLog.length === 0 ? (
          <p className="empty-note">No commands applied yet.</p>
        ) : (
          recentLog.map((entry) => (
            <article className="command-log-entry" key={entry.id}>
              <div>
                <strong>
                  {entry.commands.length} command
                  {entry.commands.length === 1 ? "" : "s"}
                </strong>
                <small>{entry.timestamp}</small>
              </div>
              <p>{formatCommandKinds(entry.commands)}</p>
              <ul>
                {entry.results
                  .flatMap((result) =>
                    result.changes.length === 0
                      ? [`${commandKindLabels[result.command.kind]}: no changes`]
                      : result.changes.slice(0, 3).map(formatChange),
                  )
                  .slice(0, 5)
                  .map((line) => (
                    <li key={`${entry.id}-${line}`}>{line}</li>
                  ))}
              </ul>
            </article>
          ))
        )}
      </aside>
    </section>
  );
}

export function Breadcrumb(props: MachinaSlotProps) {
  const { document, lastCommand } = readViewData(props);
  const selected = getSelectedObject(document);
  const layer = getObjectLayer(document, selected);

  return (
    <footer className="breadcrumb">
      <span>
        MachinaCanvas / {document.name}
        {selected ? ` / ${layer?.name ?? selected.layerId} / ${selected.id}` : ""}
      </span>
      <strong>{lastCommand}</strong>
    </footer>
  );
}
