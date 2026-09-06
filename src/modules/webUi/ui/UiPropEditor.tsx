import type { CanvasCommand } from "../../../sceneCommands";
import type { CanvasUiPropDefinition } from "../../../uiComponents/catalog";

export function UiPropEditor({
  objectId,
  prop,
  value,
  runCommand,
}: {
  objectId: string;
  prop: CanvasUiPropDefinition;
  value: unknown;
  runCommand: (command: CanvasCommand) => void;
}) {
  const label = <span>{prop.label}</span>;
  if (prop.kind === "boolean") {
    return (
      <label className="ui-prop-row ui-prop-checkbox-row">
        {label}
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) =>
            runCommand({
              kind: "setUiProp",
              id: objectId,
              prop: prop.name,
              value: event.target.checked,
            })
          }
        />
      </label>
    );
  }

  if (prop.kind === "enum") {
    return (
      <label className="ui-prop-row">
        {label}
        <select
          value={typeof value === "string" ? value : (prop.options?.[0] ?? "")}
          onChange={(event) =>
            runCommand({
              kind: "setUiProp",
              id: objectId,
              prop: prop.name,
              value: event.target.value,
            })
          }
        >
          {(prop.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="ui-prop-row">
      {label}
      <input
        type={prop.kind === "number" ? "number" : "text"}
        value={typeof value === "number" || typeof value === "string" ? value : ""}
        onChange={(event) =>
          runCommand({
            kind: "setUiProp",
            id: objectId,
            prop: prop.name,
            value: prop.kind === "number" ? Number(event.target.value) : event.target.value,
          })
        }
      />
    </label>
  );
}
