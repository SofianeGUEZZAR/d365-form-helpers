import { isExecutionContext } from "./CheckTypes";
import FormContext from "./FormContext";
import PrimaryControl from "./PrimaryControl";

/**
 * Factory for building high-level context wrappers depending on the type of context provided.
 * 
 * This static utility returns either a {@link FormContext} or a {@link PrimaryControl} depending on whether
 * the input is a Dynamics 365 `EventContext` (typically passed into event handlers), or a `FormContext`
 * (such as `Xrm.Page` or `executionContext.getFormContext()` or `primaryControl ribbon argument`).
 *
 * @example
 * ```ts
 * // Inside an event handler (e.g., onLoad, onSave, etc.)
 * const context = Provider.from(executionContext); // returns FormContext
 *
 * // From a direct formContext reference or ribbon primaryControl argument
 * const context = Provider.from(primaryControl || Xrm.Page); // returns PrimaryControl
 * ```
 */
export abstract class Provider {
    /**
     * Creates a {@link PrimaryControl} from a Dynamics 365 `FormContext`.
     * 
     * @param primaryControl - A valid `Xrm.FormContext` instance (e.g., `Xrm.Page` or `executionContext.getFormContext()`).
     * @returns An instance of {@link PrimaryControl}.
     */
    static from(primaryControl: Xrm.FormContext): PrimaryControl;
     /**
     * Creates a {@link FormContext} from a Dynamics 365 `ExecutionContext`.
     * 
     * @param executionContext - A valid `Xrm.Events.EventContext` (typically passed into a form event handler).
     * @returns An instance of {@link FormContext}.
     */
    static from(executionContext: Xrm.Events.EventContext): FormContext;
    static from(context: Xrm.Events.EventContext | Xrm.FormContext): FormContext | PrimaryControl {
        if (context) {
            if (isExecutionContext(context)) {
                return new FormContext(context);
            } else {
                return new PrimaryControl(context);
            }
        }
        throw new Error(`[D365 Form Scripting Framework - Provider] Invalid context provided. Provided context: ${context}`);
    }
}

export default Provider;