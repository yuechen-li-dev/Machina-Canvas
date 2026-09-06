import type { ReactNode } from "react";
import type { CanvasInspectorContribution } from "../../../app/inspectorContributions";
import { Field } from "../../../app/inspector/shared";
import { InspectorAccordionGroup } from "../../../InspectorAccordionGroup";
import { getCanvasUiComponentDefinition } from "../../../uiComponents/catalog";
import { UiPropEditor } from "./UiPropEditor";

export const webUiInspectorContribution: CanvasInspectorContribution = {
  id: "web-ui.component",
  order: 60,
  supports: (object) => object.kind === "uiComponent",
  renderPanels({ object, panel, runCommand }) {
    if (object.kind !== "uiComponent") return null;
    let content: ReactNode;
    try {
      const definition = getCanvasUiComponentDefinition(object.componentId);
      content = (
        <>
          <Field label="Component" value={object.componentId} />
          <Field label="Label" value={definition.label} />
          <Field label="Variant" value={object.variant ?? "none"} />
          <Field label="Export name" value={object.exportName ?? "auto"} />
          <div className="ui-prop-list">
            {definition.propSchema.map((prop) => (
              <UiPropEditor
                key={prop.name}
                objectId={object.id}
                prop={prop}
                value={object.props[prop.name] ?? definition.defaultProps[prop.name]}
                runCommand={runCommand}
              />
            ))}
          </div>
        </>
      );
    } catch (error) {
      content = (
        <Field
          label="Component"
          value={error instanceof Error ? error.message : object.componentId}
        />
      );
    }
    return (
      <InspectorAccordionGroup
        id="ui-component"
        key={`${panel.contextKey}:ui-component`}
        onOpenChange={(open) => panel.setOpen("ui-component", open)}
        open={panel.isOpen("ui-component")}
        subtitle={object.componentId}
        title="UI Component"
      >
        {content}
      </InspectorAccordionGroup>
    );
  },
};
