import PrimaryControl from "./PrimaryControl";
import Provider from "./Provider";


/**
 * Extends {@link PrimaryControl} by encapsulating both the `Xrm.FormContext` and the `Xrm.Events.EventContext`,
 * providing type-safe access to both form-level APIs and event-specific context.
 *
 * This class is intended for use within event handlers (e.g., `onLoad`, `onSave`, `onChange`), where
 * you receive an `executionContext` parameter and need to interact with both:
 * - The underlying form (`getFormContext()`)
 * - And the event metadata (source control, shared variables, depth, etc.)
 *
 * @example
 * ```ts
 * // In an onLoad handler
 * function onLoad(executionContext: Xrm.Events.EventContext) {
 *   const formContext = new FormContext(executionContext);
 * 
 *   const eventSource = formContext.getEventSource(); // control or attribute that fired the event
 *   const depth = formContext.getDepth();             // recursion depth
 * 
 *   formContext.getControl("emailaddress1")?.setDisabled(true);
 * }
 * ```
 *
 * @remarks
 * This class allows you to write cleaner, more testable event handlers by abstracting both form operations and event logic into a unified interface.
 * It eliminates the need to repeatedly call `executionContext.getFormContext()` and ensures all Dynamics 365 Client API calls remain type-safe and consistent.
 * 
 * When you're unsure whether you have an `EventContext` or a `FormContext`, use {@link Provider.from} as a factory to automatically return the appropriate wrapper
 * (`FormContext` or `PrimaryControl`) based on the context type.
 *
 * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/clientapi-execution-context External: ExecutionContext (Client API reference)}
 * @see {@link Provider.from} – Smart factory that returns either a `FormContext` or `PrimaryControl` depending on the input context.
 */

export class FormContext extends PrimaryControl {
    readonly executionContext: Xrm.Events.EventContext;

    constructor(context: Xrm.Events.EventContext) {
        super(context.getFormContext());
        this.executionContext = context;
    }

    /**
     * Gets the Xrm context.
     * @returns The {@link GlobalContext Xrm context}
     */
    public get getContext(): Xrm.Events.EventContext["getContext"] {
        return this.executionContext.getContext.bind(this.executionContext);
    }

    /**
     * Gets a reference to the object for which event occurred.
     * @returns The event source.
     */
    public get getEventSource(): Xrm.Events.EventContext["getEventSource"] {
        return this.executionContext.getEventSource.bind(this.executionContext);
    }

    /**
     * Gets the handler's depth, which is the order in which the handler is executed.
     * @returns The depth, a 0-based index.
     */
    public get getDepth(): Xrm.Events.EventContext["getDepth"] {
        return this.executionContext.getDepth.bind(this.executionContext);
    }

    /**
     * Gets a reference to the current form context
     * @returns The {@link FormContext form context}
     */
    public get getFormContext(): Xrm.Events.EventContext["getFormContext"] {
        return this.executionContext.getFormContext.bind(this.executionContext);
    }

    /**
     * @summary Gets the shared variable with the specified key.
     * @param T Generic type parameter.
     * @param key The key.
     * @returns The shared variable.
     * @description Gets the shared variable with the specified key.
     * Used to pass values between handlers of an event.
     */
    public get getSharedVariable(): Xrm.Events.EventContext["getSharedVariable"] {
        return this.executionContext.getSharedVariable.bind(this.executionContext);
    }

    /**
     * @summary Sets a shared variable.
     * @param T Generic type parameter.
     * @param key The key.
     * @param value The value.
     * @description Sets the shared variable with the specified key.
     * Used to pass values between handlers of an event.
     */
    public get setSharedVariable(): Xrm.Events.EventContext["setSharedVariable"] {
        return this.executionContext.setSharedVariable.bind(this.executionContext);
    }
}

export default FormContext;
