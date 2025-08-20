/**
 * Returns `true` if the given value is a non-null object.
 *
 * @param obj - The value to check.
 * @returns `true` if the value is a non-null object.
 */
function isObject(obj: unknown): obj is object {
    return typeof obj === "object" && obj !== null;
}

/**
 * Type guard to determine if the given value is an `Xrm.Attributes.Attribute`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `getAttributeType` method.
 */
export function isAttribute(obj: unknown): obj is Xrm.Attributes.Attribute {
    return isObject(obj) && typeof (obj as any).getAttributeType === "function";
}

/**
 * Type guard to determine if the given value is an `Xrm.Controls.Tab`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `addTabStateChange` method.
 */
export function isTabControl(obj: unknown): obj is Xrm.Controls.Tab {
    return isObject(obj) && typeof (obj as any).addTabStateChange === "function";
}

/**
 * Type guard for detecting a general `Xrm.Controls.Control`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `getControlType` method.
 */
export function isControl(obj: unknown): obj is Xrm.Controls.Control {
    return isObject(obj) && typeof (obj as any).getControlType === "function";
}

/**
 * Type guard for detecting a `Xrm.Controls.StandardControl`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `clearNotification` method.
 */
export function isStandardControl(obj: unknown): obj is Xrm.Controls.StandardControl {
    return isObject(obj) && typeof (obj as any).clearNotification === "function";
}

/**
 * Type guard for detecting a `Xrm.Controls.LookupControl`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `addOnLookupTagClick` method.
 */
export function isLookupControl(obj: unknown): obj is Xrm.Controls.LookupControl {
    return isObject(obj) && typeof (obj as any).addOnLookupTagClick === "function";
}

/**
 * Type guard for detecting a `Xrm.Controls.DateControl`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `getShowTime` method.
 */
export function isDateControl(obj: unknown): obj is Xrm.Controls.DateControl {
    return isObject(obj) && typeof (obj as any).getShowTime === "function";
}

/**
 * Type guard for detecting either a `Xrm.Controls.OptionSetControl` or `MultiSelectOptionSetControl`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `addOption` method.
 */
export function isOptionSetControl(obj: unknown): obj is Xrm.Controls.OptionSetControl | Xrm.Controls.MultiSelectOptionSetControl {
    return isObject(obj) && typeof (obj as any).addOption === "function";
}

/**
 * Type guard for detecting a `Xrm.Controls.GridControl`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `getGrid` method.
 */
export function isGridControl(obj: unknown): obj is Xrm.Controls.GridControl {
    return isObject(obj) && typeof (obj as any).getGrid === "function";
}

/**
 * Type guard for detecting a `Xrm.Controls.IframeControl`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `getContentWindow` method.
 */
export function isIframeControl(obj: unknown): obj is Xrm.Controls.IframeControl {
    return isObject(obj) && typeof (obj as any).getContentWindow === "function";
}

/**
 * Type guard for detecting a `Xrm.Controls.KbSearchControl`.
 *
 * @param obj - The value to check.
 * @returns `true` if the value has the `addOnPostSearch` method.
 */
export function isKbSearchControl(obj: unknown): obj is Xrm.Controls.KbSearchControl {
    return isObject(obj) && typeof (obj as any).addOnPostSearch === "function";
}

/**
 * Type guard to detect an `Xrm.Events.EventContext`.
 *
 * @param context - The value to check.
 * @returns `true` if the value has the `getFormContext` method.
 */
export function isExecutionContext(context: any): context is Xrm.Events.EventContext {
    return isObject(context) && typeof (context as any).getFormContext === "function";
}


/**
 * Type guard to detect an `Xrm.Events.UiCanSetVisibleElement`.
 *
 * @param context - The value to check.
 * @returns `true` if the value has the `setVisible` method.
 */
export function isControlCanSetVisible(context: any): context is Xrm.Controls.Control & Xrm.Controls.UiCanSetVisibleElement {
    return isControl(context) && typeof (context as any).setVisible === "function";
}

/**
 * Type guard to detect an `Xrm.Events.UiCanSetDisabledElement`.
 *
 * @param context - The value to check.
 * @returns `true` if the value has the `setDisabled` method.
 */
export function isControlCanSetDisabled(context: any): context is Xrm.Controls.Control & Xrm.Controls.UiCanSetDisabledElement {
    return isControl(context) && typeof (context as any).setDisabled === "function";
}
