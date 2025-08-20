import TabControl from "./TabControl";
import { isAttribute, isControlCanSetDisabled, isControlCanSetVisible, isGridControl, isIframeControl, isKbSearchControl, isLookupControl, isStandardControl, isTabControl } from './CheckTypes';
import { warnMessage } from "../utils/logger";
import Provider from "./Provider"


/**
 * Provides a high-level, type-safe abstraction over the Dynamics 365 {@link Xrm.FormContext} object,
 * commonly referred to as the "Primary Control".
 *
 * This class is designed to simplify and centralize access to core form elements such as:
 * - Attributes
 * - Controls
 * - Tabs and Sections
 * - Form-level events (e.g., `onLoad`, `onSave`)
 * - Form type, entity name, ID, UI state, and more
 *
 * It is intended for use when you already have a direct reference to the form context,
 * such as via `Xrm.Page` or `executionContext.getFormContext()` or `primaryControl ribbon parameter`.
 *
 * @example
 * ```ts
 * const formContext = new PrimaryControl(executionContext.getFormContext() || primaryControl);
 * 
 * // Access an attribute safely
 * const nameAttr = formContext.getAttribute("fullname");
 * 
 * // Set an attribute value
 * formContext.setAttributeValue("statecode", 0);
 * 
 * // Hide a control
 * formContext.getControl("mobilephone")?.setVisible(false);
 * 
 * // Determine if the form is in Create mode
 * if (formContext.isCreate()) {
 *     // do something
 * }
 * ```
 * 
 * @remarks
 * When you're unsure whether you have an `EventContext` or a `FormContext`, use {@link Provider.from} as a factory to automatically return the appropriate wrapper
 * (`PrimaryControl` or `FormContext`) based on the detected context type.
 *
 * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/clientapi-form-context External: Microsoft FormContext documentation}
 * @see {@link Provider.from} – Smart factory that returns either a `FormContext` or `PrimaryControl` depending on the input context.
 */

export class PrimaryControl {
    readonly formContext: Xrm.FormContext;

    constructor(context: Xrm.FormContext) {
        this.formContext = context;
    }


    //#region Standard Getter



    /**
     * Gets the `Xrm.Data` object for this form.
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/formcontext-data External Link: formContext.data (Client API reference)}
     */
    public get data(): Xrm.Data { return this.formContext.data; }
    /**
     * Gets the `Xrm.Ui` object for this form.
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/formcontext-ui External Link: formContext.ui (Client API reference)}
     */
    public get ui(): Xrm.Ui { return this.formContext.ui; }

    //#endregion


    //#region Generic

    private setToObject<TInput extends Object, TValid extends TInput, TValue>(
        input: TInput | string | number | (number | string | TInput)[] | Xrm.Collection.MatchingDelegate<TInput> | undefined,
        value: TValue,
        getter: (input: string | number) => TValid,
        getterAll: (delegateFunction: Xrm.Collection.MatchingDelegate<TInput>) => TValid[],
        valueApplier: (input: TValid, value: TValue) => void,
        isValid: (item: TInput) => item is TValid,
    ): void {
        if (input === undefined) {
            return;
        }

        if (Array.isArray(input)) {
            input.flatMap(component => this.setToObject(component, value, getter, getterAll, valueApplier, isValid));
            return;
        }

        if (typeof input === "string" || typeof input === "number") {
            const component = getter(input);
            if (!component) {
                valueApplier(component, value);
            }
            return;
        }

        if (typeof input === "function") {
            const components = getterAll(input);
            components.forEach(control => valueApplier(control, value));
            return;
        }

        if (isValid(input)) {
            valueApplier(input, value);
            return;
        }
    };

    private getObject<TInput, TOutput>(
        input: string | number | (number | string)[] | Xrm.Collection.MatchingDelegate<TInput> | undefined,
        resolver: (input: string | number) => TOutput | null,
        resolverAll: (delegateFunction: Xrm.Collection.MatchingDelegate<TInput>) => TOutput[],
    ): TOutput | TOutput[] | null {
        if (input === undefined) {
            return null;
        }

        if (Array.isArray(input)) {
            const objects = input.map(object => resolver(object)).filter<TOutput>(object => object !== null);
            return objects;
        }

        if (typeof input === "string" || typeof input === "number") {
            const control = resolver(input);
            if (!control) {
                return null;
            }
            return control;
        }

        const controls = resolverAll(input);
        return controls;
    };

    private addHandler<TInput extends Object, TValid extends TInput>(
        input: string | number | (number | string | TValid)[] | Xrm.Collection.MatchingDelegate<TInput> | TValid | undefined,
        get: (input: string | number) => TValid | null,
        getDelegate: (input: Xrm.Collection.MatchingDelegate<TInput>) => TValid[],
        apply: (item: TValid) => void,
        isValid: (item: TInput) => item is TValid,
        addHandlerName: string
    ): void {
        if (input === undefined) {
            warnMessage(`[PrimaryControl - Warning] ${addHandlerName}: Unsupported input:`, input);
            return;
        }

        if (Array.isArray(input)) {
            for (const i of input) {
                this.addHandler(i, get, getDelegate, apply, isValid, addHandlerName);
            }
            return;
        }

        if (typeof input === "string" || typeof input === "number") {
            const item = get(input);
            if (item)
                apply(item);
            else {
                warnMessage(`[PrimaryControl - Warning] ${addHandlerName}: Attribute "${input ?? "(unknown)"}" not found.`);
            }
            return;
        }

        if (typeof input === "function") {
            const items = getDelegate(input);

            for (const item of items) {
                apply(item);
            }
            return;
        }

        if (isValid(input)) {
            apply(input);
            return;
        }

        warnMessage(`[PrimaryControl - Warning] ${addHandlerName}: Unhandled input type (${typeof input})`, input);
    }

    //#endregion


    //#region Overrided Getter

    /**
     * Returns an attribute or list of attributes from the form.
     *
     * @param input The attribute name(s), index(es), or matching delegate.
     * @returns A single attribute, array of attributes, or null.
     *
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/attributes
     */
    public getAttribute<T extends Xrm.Attributes.Attribute>(attributeIndexOrName: number | string): T | null;
    public getAttribute<T extends Xrm.Attributes.Attribute>(attributeIndexesOrNames: (number | string)[]): T[];
    public getAttribute<T extends Xrm.Attributes.Attribute>(delegateFunction?: Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): T[];
    public getAttribute<T extends Xrm.Attributes.Attribute>(input?: string | number | (number | string)[] | Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): T | T[] | null {

        return this.getObject<Xrm.Attributes.Attribute, T>(input,
            (input) => this.formContext.getAttribute<T>(input),
            (input) => this.formContext.getAttribute<T>(input)
        );
    };


    /**
     * Returns a control or list of controls from the form.
     *
     * @param input The control name(s), index(es), or matching delegate.
     * @returns A single control, array of controls, or null.
     *
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/controls
     */
    public getControl<T extends Xrm.Controls.Control>(controlIndexOrName: number | string): T | null;
    public getControl<T extends Xrm.Controls.Control>(controlIndexesOrNames: (number | string)[]): T[];
    public getControl<T extends Xrm.Controls.Control>(delegateFunction?: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>): T[];
    public getControl<T extends Xrm.Controls.Control>(input?: string | number | (number | string)[] | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>): T | T[] | null {

        return this.getObject<Xrm.Controls.Control, T>(input,
            (input) => this.formContext.getControl<T>(input),
            (input) => this.formContext.getControl<T>(input)
        );
    };


    /**
     * Returns a tab or list of tabs from the form.
     *
     * @param input The tab name(s), index(es), or matching delegate.
     * @returns A single {@link TabControl} instance, array of {@link TabControl}, or null.
     * 
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/formcontext-ui-tabs
     */
    public getTab(tabIndexOrName: number | string): TabControl | null;
    public getTab(tabIndexesOrNames: (number | string)[]): TabControl[];
    public getTab(predicate?: Xrm.Collection.MatchingDelegate<Xrm.Controls.Tab>): TabControl[];
    public getTab(input?: number | string | (number | string)[] | Xrm.Collection.MatchingDelegate<Xrm.Controls.Tab>): TabControl | TabControl[] | null {

        return this.getObject<Xrm.Controls.Tab, TabControl>(input,
            (input) => {
                const tabControl = this.formContext.ui.tabs.get(input);
                if (tabControl) {
                    return new TabControl(tabControl)
                }
                return null;
            },
            (input) => this.formContext.ui.tabs.get(input).map(tabControl => new TabControl(tabControl))
        );
    }


    /**
     * Returns a section or list of sections from the form, regardless of which tab they belong to.
     *
     * @param input The section name(s), index(es), or matching delegate.
     * @returns A single section, array of sections, or null.
     * 
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/formcontext-ui-tab-sections
     */
    public getSection(sectionIndexOrName: number | string): Xrm.Controls.Section | null;
    public getSection(sectionIndexesOrNames: (number | string)[]): Xrm.Controls.Section[];
    public getSection(predicate?: Xrm.Collection.MatchingDelegate<Xrm.Controls.Section>): Xrm.Controls.Section[];
    public getSection(input?: number | string | (number | string)[] | Xrm.Collection.MatchingDelegate<Xrm.Controls.Section>): Xrm.Controls.Section | Xrm.Controls.Section[] | null {

        return this.getObject<Xrm.Controls.Section, Xrm.Controls.Section>(input,
            (input) => this.getTab().map(tab => tab.getSection(input)).find(section => !!section) ?? null,
            (input) => this.getTab().flatMap(tab => tab.getSection(input))
        );
    }

    //#endregion


    //#region Event Setters

    /**
     * Adds a handler for the form OnLoad event.
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/form-onload
     */
    public addOnLoad(handler: Xrm.Events.ContextSensitiveHandler) { this.ui.addOnLoad(handler); }
    /**
     * Adds a handler for the data OnLoad event.
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/form-data-onload
     */
    public addOnDataLoad(handler: Xrm.Events.ContextSensitiveHandler) { this.data.addOnLoad(handler); }
    /**
     * Adds a handler for the loaded event (custom UI).
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/form-loaded
     */
    public addLoaded(handler: Xrm.Events.ContextSensitiveHandler) { (this.ui as any).addLoaded(handler); }

    /**
     * Adds a handler for the OnSave event.
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/form-onsave
     */
    public addOnSave(handler: Xrm.Events.ContextSensitiveHandler) { this.data.entity.addOnSave(handler); }
    /**
     * Adds a handler for the PostSave event.
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/postsave
     */
    public addOnPostSave(handler: Xrm.Events.ContextSensitiveHandler) { this.data.entity.addOnPostSave(handler); }

    /**
     * Adds a handler for the PreProcessStatusChange event.
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onpreprocessstatuschange
     */
    public addOnPreProcessStatusChange(handler: Xrm.Events.ContextSensitiveHandler) { this.data.process.addOnPreProcessStatusChange(handler); }
    /**
     * Adds a handler for the ProcessStatusChange event.
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onprocessstatuschange
     */
    public addOnProcessStatusChange(handler: Xrm.Events.ContextSensitiveHandler) { this.data.process.addOnProcessStatusChange(handler); }
    /**
     * Adds a handler for the PreStageChange event.
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onprestagechange
     */
    public addOnPreStageChange(handler: Xrm.Events.ContextSensitiveHandler) { this.data.process.addOnPreStageChange(handler); }
    /**
     * Adds a handler for the StageChange event.
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onstagechange
     */
    public addOnStageChange(handler: Xrm.Events.ContextSensitiveHandler) { this.data.process.addOnStageChange(handler); }
    /**
     * Adds a handler for the StageSelected event.
     * @see https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onstageselected
     */
    public addOnStageSelected(handler: Xrm.Events.ContextSensitiveHandler) { this.data.process.addOnStageSelected(handler); }


    /**
      * Adds a handler for the OnChange event of a specific attribute.
      *
      * @param attributeOrIndexOrName - The attribute object, its name (string), or its index (number).
      * @param handler - The function to execute when the attribute value changes.
      *
      * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/attribute-onchange External Link: OnChange event (Client API reference)}
      */
    public addOnChange(attributeOrIndexOrName: number | string | Xrm.Attributes.Attribute, handler: Xrm.Events.Attribute.ChangeEventHandler): void;
    /**
     * Adds a handler for the OnChange event of attributes that match the provided predicate.
     *
     * @param predicate - A delegate function that returns true for matching attributes.
     * @param handler - The function to execute when the value of any matched attribute changes.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/attribute-onchange External Link: OnChange event (Client API reference)}
     */
    public addOnChange(predicate: Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>, handler: Xrm.Events.Attribute.ChangeEventHandler): void;
    /**
     * Adds a handler for the OnChange event of multiple attributes.
     *
     * @param attributeArray - An array of attribute objects, names (strings), or indices (numbers).
     * @param handler - The function to execute when the value of any of the listed attributes changes.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/attribute-onchange External Link: OnChange event (Client API reference)}
     */
    public addOnChange(attributeArray: (Xrm.Attributes.Attribute | string | number)[], handler: Xrm.Events.Attribute.ChangeEventHandler): void;
    public addOnChange(
        input: number | string | Xrm.Attributes.Attribute | Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute> | (Xrm.Attributes.Attribute | string | number)[],
        handler: Xrm.Events.Attribute.ChangeEventHandler
    ): void {

        this.addHandler(input,
            (input) => this.getAttribute(input),
            (input) => this.getAttribute(input),
            (attribute) => attribute.addOnChange(handler),
            isAttribute,
            "addOnChange"
        );
    }


    /**
     * Adds a handler for the TabStateChange event on a tab specified by its object, name, or index.
     *
     * @param tabOrIndexOrName The tab control object, its name as a string, or its index as a number.
     * @param handler The callback function invoked when the tab's state changes.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/tabstatechange TabStateChange event (Client API reference)}
     */
    public addTabStateChange(tabOrIndexOrName: number | string | Xrm.Controls.Tab, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the TabStateChange event on all tabs matching the given predicate.
     *
     * @param predicate A filtering function that returns true for tabs to which the handler will be attached.
     * @param handler The callback function invoked when any matched tab's state changes.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/tabstatechange TabStateChange event (Client API reference)}
     */
    public addTabStateChange(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Tab>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the TabStateChange event on multiple tabs specified in an array.
     *
     * @param tabArray An array of tab controls, tab names, or tab indices to which the handler will be attached.
     * @param handler The callback function invoked when any of the specified tabs' state changes.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/tabstatechange TabStateChange event (Client API reference)}
     */
    public addTabStateChange(tabArray: (Xrm.Controls.Tab | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addTabStateChange(
        input: number | string | Xrm.Controls.Tab | Xrm.Collection.MatchingDelegate<Xrm.Controls.Tab> | (Xrm.Controls.Tab | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getTab(input),
            (input) => this.getTab(input),
            (tabControl) => tabControl.addTabStateChange(handler),
            isTabControl,
            "addTabStateChange"
        );
    }

    /**
     * Adds a handler for the LookupTagClick event on a lookup control specified by its object, name, or index.
     *
     * @param controlOrIndexOrName The lookup control object, its name as a string, or its index as a number.
     * @param handler The callback function invoked when the lookup tag is clicked.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onlookuptagclick LookupTagClick event (Client API reference)}
     */
    public addOnLookupTagClick(controlOrIndexOrName: number | string | Xrm.Controls.LookupControl, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the LookupTagClick event on all controls matching the given predicate.
     *
     * @param predicate A filtering function that returns true for controls to which the handler will be attached.
     * @param handler The callback function invoked when any matched lookup tag is clicked.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onlookuptagclick LookupTagClick event (Client API reference)}
     */
    public addOnLookupTagClick(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the LookupTagClick event on multiple lookup controls specified in an array.
     *
     * @param controlArray An array of lookup controls, control names, or control indices to which the handler will be attached.
     * @param handler The callback function invoked when any of the specified lookup tags is clicked.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onlookuptagclick LookupTagClick event (Client API reference)}
     */
    public addOnLookupTagClick(controlArray: (Xrm.Controls.LookupControl | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addOnLookupTagClick(
        input: number | string | Xrm.Controls.LookupControl | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control> | (Xrm.Controls.LookupControl | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getControl(input),
            (input) => this.getControl(input),
            (lookupControl) => lookupControl.addOnLookupTagClick(handler),
            isLookupControl,
            "addOnLookupTagClick"
        );
    }


    /**
     * Adds a handler for the PreSearch event on a lookup control specified by its object, name, or index.
     *
     * @param controlOrIndexOrName The lookup control object, its name as a string, or its index as a number.
     * @param handler The callback function invoked before the search is executed.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/presearch PreSearch event (Client API reference)}
     */
    public addPreSearch(controlOrIndexOrName: number | string | Xrm.Controls.LookupControl, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the PreSearch event on all controls matching the given predicate.
     *
     * @param predicate A filtering function that returns true for controls to which the handler will be attached.
     * @param handler The callback function invoked before the search is executed on matched controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/presearch PreSearch event (Client API reference)}
     */
    public addPreSearch(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the PreSearch event on multiple lookup controls specified in an array.
     *
     * @param controlArray An array of lookup controls, control names, or control indices to which the handler will be attached.
     * @param handler The callback function invoked before the search is executed on any of the specified controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/presearch PreSearch event (Client API reference)}
     */
    public addPreSearch(controlArray: (Xrm.Controls.LookupControl | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addPreSearch(
        input: number | string | Xrm.Controls.LookupControl | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control> | (Xrm.Controls.LookupControl | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getControl(input),
            (input) => this.getControl(input),
            (lookupControl) => lookupControl.addPreSearch(handler),
            isLookupControl,
            "addPreSearch"
        );
    }


    /**
     * Adds an `onLoad` handler to a subgrid by control index, name, or instance.
     *
     * @param controlOrIndexOrName - A control index (`number`), name (`string`), or a subgrid `GridControl` instance.
     * @param handler - The handler to call when the subgrid finishes loading.
     *
     * @example
     * formContext.addSubGridOnLoad("contacts", (context) => {
     *   console.log("Subgrid loaded:", context.getEventSource().getName());
     * });
     * 
     * formContext.addSubGridOnLoad(0, (context) => {
     *   console.log("Subgrid loaded:", context.getEventSource().getName());
     * });
     * 
     * const gridControl = formContext.getControl("contacts");
     * formContext.addSubGridOnLoad(gridControl, (context) => {
     *   console.log("Subgrid loaded:", context.getEventSource().getName());
     * });
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/gridcontrol/addonload | Microsoft Docs - GridControl.addOnLoad}
     */
    public addSubGridOnLoad(controlOrIndexOrName: number | string | Xrm.Controls.GridControl, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds an `onLoad` handler to multiple subgrid controls.
     *
     * @param controlArray - An array of subgrid control instances, names, or indexes.
     * @param handler - The handler to call when each subgrid in the array finishes loading.
     *
     * @example
     * const gridControl = formContext.getControl("contacts");
     * formContext.addSubGridOnLoad(["contacts", "opportunities", 1, gridControl], (context) => {
     *   console.log("Subgrid loaded:", context.getEventSource().getName());
     * });
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/gridcontrol/addonload | Microsoft Docs - GridControl.addOnLoad}
     */
    public addSubGridOnLoad(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds an `onLoad` handler to all subgrid controls that match the specified predicate.
     *
     * @param predicate - A matching delegate used to select one or more subgrid controls.
     * @param handler - The handler to call when each matching subgrid finishes loading.
     *
     * @example
     * formContext.addSubGridOnLoad(c => c.getName().startsWith("sub_"), (context) => {
     *   console.log("Subgrid loaded:", context.getEventSource().getName());
     * });
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/gridcontrol/addonload | Microsoft Docs - GridControl.addOnLoad}
     */
    public addSubGridOnLoad(controlArray: (Xrm.Controls.GridControl | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addSubGridOnLoad(
        input: number | string | Xrm.Controls.GridControl | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control> | (Xrm.Controls.GridControl | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getControl(input),
            (input) => this.getControl(input),
            (gridControl) => gridControl.addOnLoad(handler),
            isGridControl,
            "addSubGridOnLoad"
        );
    }

    /**
     * Adds a handler for the OnRecordSelect event on a subgrid control specified by its object, name, or index.
     *
     * @param controlOrIndexOrName The subgrid control object, its name as a string, or its index as a number.
     * @param handler The callback function invoked when a record is selected in the subgrid.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/grid-onrecordselect OnRecordSelect event (Client API reference)}
     */
    public addSubGridOnRecordSelect(controlOrIndexOrName: number | string | Xrm.Controls.GridControl, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnRecordSelect event on all controls matching the given predicate.
     *
     * @param predicate A filtering function that returns true for controls to which the handler will be attached.
     * @param handler The callback function invoked when a record is selected in the matched subgrid controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/grid-onrecordselect OnRecordSelect event (Client API reference)}
     */
    public addSubGridOnRecordSelect(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnRecordSelect event on multiple subgrid controls specified in an array.
     *
     * @param controlArray An array of subgrid controls, control names, or control indices to which the handler will be attached.
     * @param handler The callback function invoked when a record is selected in any of the specified subgrids.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/grid-onrecordselect OnRecordSelect event (Client API reference)}
     */
    public addSubGridOnRecordSelect(controlArray: (Xrm.Controls.GridControl | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addSubGridOnRecordSelect(
        input: number | string | Xrm.Controls.GridControl | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control> | (Xrm.Controls.GridControl | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getControl(input),
            (input) => this.getControl(input),
            (gridControl) => (gridControl.getGrid() as any).addOnRecordSelect(handler),
            isGridControl,
            "addSubGridOnSave"
        );
    }


    /**
     * Adds a handler for the OnReadyStateComplete event on an iframe control specified by its object, name, or index.
     *
     * @param controlOrIndexOrName The iframe control object, its name as a string, or its index as a number.
     * @param handler The callback function invoked when the iframe has completed loading.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onreadystatecomplete OnReadyStateComplete event (Client API reference)}
     */
    public addOnReadyStateComplete(controlOrIndexOrName: number | string | Xrm.Controls.IframeControl, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnReadyStateComplete event on all controls matching the given predicate.
     *
     * @param predicate A filtering function that returns true for controls to which the handler will be attached.
     * @param handler The callback function invoked when the iframe has completed loading on the matched controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onreadystatecomplete OnReadyStateComplete event (Client API reference)}
     */
    public addOnReadyStateComplete(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnReadyStateComplete event on multiple iframe controls specified in an array.
     *
     * @param controlArray An array of iframe controls, control names, or control indices to which the handler will be attached.
     * @param handler The callback function invoked when the iframe has completed loading on any of the specified controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onreadystatecomplete OnReadyStateComplete event (Client API reference)}
     */
    public addOnReadyStateComplete(controlArray: (Xrm.Controls.IframeControl | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addOnReadyStateComplete(
        input: number | string | Xrm.Controls.IframeControl | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control> | (Xrm.Controls.IframeControl | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getControl(input),
            (input) => this.getControl(input),
            (iframeControl) => (iframeControl as any).addOnReadyStateComplete(handler),
            isIframeControl,
            "addOnReadyStateComplete"
        );
    }


    /**
     * Adds a handler for the OnOutputChange event on a standard control specified by its object, name, or index.
     *
     * @param controlOrIndexOrName The standard control object, its name as a string, or its index as a number.
     * @param handler The callback function invoked when the control's output changes.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onoutputchange OnOutputChange event (Client API reference)}
     */
    public addOnOutputChange(controlOrIndexOrName: number | string | Xrm.Controls.StandardControl, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnOutputChange event on all controls matching the given predicate.
     *
     * @param predicate A filtering function that returns true for controls to which the handler will be attached.
     * @param handler The callback function invoked when the control's output changes on the matched controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onoutputchange OnOutputChange event (Client API reference)}
     */
    public addOnOutputChange(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnOutputChange event on multiple standard controls specified in an array.
     *
     * @param controlArray An array of standard controls, control names, or control indices to which the handler will be attached.
     * @param handler The callback function invoked when the output changes on any of the specified controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onoutputchange OnOutputChange event (Client API reference)}
     */
    public addOnOutputChange(controlArray: (Xrm.Controls.StandardControl | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addOnOutputChange(
        input: number | string | Xrm.Controls.StandardControl | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control> | (Xrm.Controls.StandardControl | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getControl(input),
            (input) => this.getControl(input),
            (control) => control.addOnOutputChange(handler),
            isStandardControl,
            "addOnOutputChange"
        );
    }


    /**
     * Adds a handler for the OnResultOpened event on a KbSearch control specified by its object, name, or index.
     *
     * @param controlOrIndexOrName The KbSearch control object, its name as a string, or its index as a number.
     * @param handler The callback function invoked when a result is opened in the control.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onresultopened OnResultOpened event (Client API reference)}
     */
    public addOnResultOpened(controlOrIndexOrName: number | string | Xrm.Controls.KbSearchControl, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnResultOpened event on all controls matching the given predicate.
     *
     * @param predicate A filtering function that returns true for controls to which the handler will be attached.
     * @param handler The callback function invoked when a result is opened in any of the matched controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onresultopened OnResultOpened event (Client API reference)}
     */
    public addOnResultOpened(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnResultOpened event on multiple KbSearch controls specified in an array.
     *
     * @param controlArray An array of KbSearch controls, control names, or control indices to which the handler will be attached.
     * @param handler The callback function invoked when a result is opened in any of the specified controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onresultopened OnResultOpened event (Client API reference)}
     */
    public addOnResultOpened(controlArray: (Xrm.Controls.KbSearchControl | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addOnResultOpened(
        input: number | string | Xrm.Controls.KbSearchControl | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control> | (Xrm.Controls.KbSearchControl | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getControl(input),
            (input) => this.getControl(input),
            (control) => control.addOnResultOpened(handler),
            isKbSearchControl,
            "addOnResultOpened"
        );
    }

    /**
     * Adds a handler for the OnSelection event on a KbSearch control specified by its object, name, or index.
     *
     * @param controlOrIndexOrName The KbSearch control object, its name as a string, or its index as a number.
     * @param handler The callback function invoked when a selection occurs in the control.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onselection OnSelection event (Client API reference)}
     */
    public addOnSelection(controlOrIndexOrName: number | string | Xrm.Controls.KbSearchControl, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnSelection event on all controls matching the given predicate.
     *
     * @param predicate A filtering function that returns true for controls to which the handler will be attached.
     * @param handler The callback function invoked when a selection occurs in any of the matched controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onselection OnSelection event (Client API reference)}
     */
    public addOnSelection(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnSelection event on multiple KbSearch controls specified in an array.
     *
     * @param controlArray An array of KbSearch controls, control names, or control indices to which the handler will be attached.
     * @param handler The callback function invoked when a selection occurs in any of the specified controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onselection OnSelection event (Client API reference)}
     */
    public addOnSelection(controlArray: (Xrm.Controls.KbSearchControl | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addOnSelection(
        input: number | string | Xrm.Controls.KbSearchControl | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control> | (Xrm.Controls.KbSearchControl | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getControl(input),
            (input) => this.getControl(input),
            (control) => control.addOnSelection(handler),
            isKbSearchControl,
            "addOnSelection"
        );
    }

    /**
     * Adds a handler for the OnPostSearch event on a KbSearch control specified by its object, name, or index.
     *
     * @param controlOrIndexOrName The KbSearch control object, its name as a string, or its index as a number.
     * @param handler The callback function invoked after a search is performed in the control.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/postsearch OnPostSearch event (Client API reference)}
     */
    public addOnPostSearch(controlOrIndexOrName: number | string | Xrm.Controls.KbSearchControl, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnPostSearch event on all controls matching the given predicate.
     *
     * @param predicate A filtering function that returns true for controls to which the handler will be attached.
     * @param handler The callback function invoked after a search is performed in any of the matched controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/postsearch OnPostSearch event (Client API reference)}
     */
    public addOnPostSearch(predicate: Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, handler: Xrm.Events.ContextSensitiveHandler): void;
    /**
     * Adds a handler for the OnPostSearch event on multiple KbSearch controls specified in an array.
     *
     * @param controlArray An array of KbSearch controls, control names, or control indices to which the handler will be attached.
     * @param handler The callback function invoked after a search is performed in any of the specified controls.
     *
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/postsearch OnPostSearch event (Client API reference)}
     */
    public addOnPostSearch(controlArray: (Xrm.Controls.KbSearchControl | string | number)[], handler: Xrm.Events.ContextSensitiveHandler): void;
    public addOnPostSearch(
        input: number | string | Xrm.Controls.KbSearchControl | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control> | (Xrm.Controls.KbSearchControl | string | number)[],
        handler: Xrm.Events.ContextSensitiveHandler
    ): void {

        this.addHandler(input,
            (input) => this.getControl(input),
            (input) => this.getControl(input),
            (control) => control.addOnPostSearch(handler),
            isKbSearchControl,
            "addOnPostSearch"
        );
    }
    //#endregion


    //#region Custom

    /**
     * Gets the value of a single attribute specified by its index or name.
     *
     * @template T The type of the attribute, extending Xrm.Attributes.Attribute.
     * @param attributeIndexOrName The index (number) or logical name (string) of the attribute.
     * @returns The value of the attribute, or null if not found.
     */
    public getAttributeValue<T extends Xrm.Attributes.Attribute>(attributeIndexOrName: number | string): GetValueReturnType<T>;
    /**
     * Gets the values of multiple attributes specified by an array of indices or names.
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param attributeArray An array of indices (number) or logical names (string) of the attributes.
     * @returns An array of values corresponding to the specified attributes.
     */
    public getAttributeValue<T extends Xrm.Attributes.Attribute>(attributeArray: (number | string)[]): GetValueReturnType<T>[];
    /**
     * Gets the values of attributes matching the given predicate function.
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param delegateFunction A predicate function to filter attributes.
     * @returns An array of values of the attributes that match the predicate.
     */
    public getAttributeValue<T extends Xrm.Attributes.Attribute>(delegateFunction: Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): GetValueReturnType<T>[];
    public getAttributeValue<T extends Xrm.Attributes.Attribute>(input: string | number | (number | string)[] | Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): GetValueReturnType<T>[] | GetValueReturnType<T> | null {
        if (!input) {
            warnMessage(`[PrimaryControl - Warning] getAttributeValue: Unsupported input type:`, input);
            return null;
        }

        return this.getObject<Xrm.Attributes.Attribute, GetValueReturnType<T>>(
            input,
            (input) => this.formContext.getAttribute<T>(input)?.getValue() as GetValueReturnType<T> ?? null,
            (input) => this.formContext.getAttribute<T>(input).map(attribute => attribute.getValue() as GetValueReturnType<T>)
        );
    };


    /**
     * Sets the value of a single attribute specified by its index or name.
     *
     * @template T The type of the attribute, extending Xrm.Attributes.Attribute (@types/xrm: {@link Xrm.Attributes.Attribute}).
     * @param attributeOrIndexOrName The index (number) or logical name (string) of the attribute.
     * @param value The value to set on the attribute.
     */
    public setAttributeValue<T extends Xrm.Attributes.Attribute>(attributeOrIndexOrName: number | string | T, value: SetValueParamType<T>): void;
    /**
     * Sets the values of multiple attributes specified by an array of indices or names.
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute (@types/xrm: {@link Xrm.Attributes.Attribute}).
     * @param attributeIndexesOrNames An array of indices (number) or logical names (string) of the attributes.
     * @param value The value to set on all specified attributes.
     */
    public setAttributeValue<T extends Xrm.Attributes.Attribute>(attributeIndexesOrNames: (number | string | T)[], value: SetValueParamType<T>): void;
    /**
     * Sets the values of attributes matching the given predicate function.
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute (@types/xrm: {@link Xrm.Attributes.Attribute}).
     * @param delegateFunction A predicate function to filter attributes.
     * @param value The value to set on all matched attributes.
     */
    public setAttributeValue<T extends Xrm.Attributes.Attribute>(delegateFunction: Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>, value: SetValueParamType<T>): void;
    public setAttributeValue<T extends Xrm.Attributes.Attribute>(input: T | string | number | (number | string | T)[] | Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>, value: SetValueParamType<T>): void {
        if (!input) {
            warnMessage(`[PrimaryControl - Warning] getAttributeValue: Unsupported input type:`, input);
            return;
        }

        this.setToObject(
            input,
            value,
            this.getAttribute,
            this.getAttribute,
            (input, value) => input.setValue(value),
            isAttribute
        );
    };


    /**
     * Sets the requirement level of a single attribute specified by its index, name, or reference.
     *
     * @template T The type of the attribute, extending Xrm.Attributes.Attribute.
     * @param controlOrOrIndexOrName The index (number), logical name (string), or attribute reference.
     * @param requirementLevel The requirement level to apply (none, required, recommended).
     */
    public setRequiredLevel<T extends Xrm.Attributes.Attribute>(controlOrOrIndexOrName: number | string | T, requirementLevel: Xrm.Attributes.RequirementLevel): void;
    /**
     * Sets the requirement level of multiple attributes specified by an array of indices, names, or references.
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param controlArray An array of indices (number), logical names (string), or attribute references.
     * @param requirementLevel The requirement level to apply (none, required, recommended).
     */
    public setRequiredLevel<T extends Xrm.Attributes.Attribute>(controlArray: (number | string | T)[], requirementLevel: Xrm.Attributes.RequirementLevel): void;
    /**
     * Sets the requirement level of attributes matching the given predicate function.
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param delegateFunction A predicate function to filter attributes.
     * @param requirementLevel The requirement level to apply (none, required, recommended).
     */
    public setRequiredLevel<T extends Xrm.Attributes.Attribute>(delegateFunction: Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>, requirementLevel: Xrm.Attributes.RequirementLevel): void;
    public setRequiredLevel<T extends Xrm.Attributes.Attribute>(input: T | string | number | (number | string | T)[] | Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>, requirementLevel: Xrm.Attributes.RequirementLevel): void {
        if (!input) {
            warnMessage(`[PrimaryControl - Warning] setRequiredLevel: Unsupported input type:`, input);
            return;
        }

        this.setToObject(
            input,
            requirementLevel,
            this.getAttribute,
            this.getAttribute,
            (control, requirementLevel) => control.setRequiredLevel(requirementLevel),
            isAttribute
        );
    };


    /**
     * Sets a single attribute as optional (requirement level = none).
     *
     * @template T The type of the attribute, extending Xrm.Attributes.Attribute.
     * @param controlOrOrIndexOrName The index (number), logical name (string), or attribute reference.
     */
    public setOptional<T extends Xrm.Attributes.Attribute>(controlOrOrIndexOrName: number | string | T): void;
    /**
     * Sets multiple attributes as optional (requirement level = none).
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param controlArray An array of indices (number), logical names (string), or attribute references.
     */
    public setOptional<T extends Xrm.Attributes.Attribute>(controlArray: (number | string | T)[]): void;
    /**
     * Sets attributes matching the given predicate as optional (requirement level = none).
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param delegateFunction A predicate function to filter attributes.
     */
    public setOptional<T extends Xrm.Attributes.Attribute>(delegateFunction: Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): void;
    public setOptional<T extends Xrm.Attributes.Attribute>(input: T | string | number | (number | string | T)[] | Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): void {
        if (!input) {
            warnMessage(`[PrimaryControl - Warning] setOptional: Unsupported input type:`, input);
            return;
        }

        const requirementLevel: Xrm.Attributes.RequirementLevel = 'none';

        this.setToObject(
            input,
            requirementLevel,
            this.getAttribute,
            this.getAttribute,
            (control, requirementLevel) => control.setRequiredLevel(requirementLevel),
            isAttribute
        );
    };


    /**
     * Sets a single attribute as recommended (requirement level = recommended).
     *
     * @template T The type of the attribute, extending Xrm.Attributes.Attribute.
     * @param controlOrOrIndexOrName The index (number), logical name (string), or attribute reference.
     */
    public setRecommended<T extends Xrm.Attributes.Attribute>(controlOrOrIndexOrName: number | string | T): void;
    /**
     * Sets multiple attributes as recommended (requirement level = recommended).
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param controlArray An array of indices (number), logical names (string), or attribute references.
     */
    public setRecommended<T extends Xrm.Attributes.Attribute>(controlArray: (number | string | T)[]): void;
    /**
     * Sets attributes matching the given predicate as recommended (requirement level = recommended).
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param delegateFunction A predicate function to filter attributes.
     */
    public setRecommended<T extends Xrm.Attributes.Attribute>(delegateFunction: Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): void;
    public setRecommended<T extends Xrm.Attributes.Attribute>(input: T | string | number | (number | string | T)[] | Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): void {
        if (!input) {
            warnMessage(`[PrimaryControl - Warning] setRecommended: Unsupported input type:`, input);
            return;
        }

        const requirementLevel: Xrm.Attributes.RequirementLevel = 'recommended';

        this.setToObject(
            input,
            requirementLevel,
            this.getAttribute,
            this.getAttribute,
            (control, requirementLevel) => control.setRequiredLevel(requirementLevel),
            isAttribute
        );
    };


    /**
     * Sets a single attribute as mandatory (requirement level = required).
     *
     * @template T The type of the attribute, extending Xrm.Attributes.Attribute.
     * @param controlOrOrIndexOrName The index (number), logical name (string), or attribute reference.
     */
    public setMandatory<T extends Xrm.Attributes.Attribute>(controlOrOrIndexOrName: number | string | T): void;
    /**
     * Sets multiple attributes as mandatory (requirement level = required).
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param controlArray An array of indices (number), logical names (string), or attribute references.
     */
    public setMandatory<T extends Xrm.Attributes.Attribute>(controlArray: (number | string | T)[]): void;
    /**
     * Sets attributes matching the given predicate as mandatory (requirement level = required).
     *
     * @template T The type of the attributes, extending Xrm.Attributes.Attribute.
     * @param delegateFunction A predicate function to filter attributes.
     */
    public setMandatory<T extends Xrm.Attributes.Attribute>(delegateFunction: Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): void;
    public setMandatory<T extends Xrm.Attributes.Attribute>(input: T | string | number | (number | string | T)[] | Xrm.Collection.MatchingDelegate<Xrm.Attributes.Attribute>): void {
        if (!input) {
            warnMessage(`[PrimaryControl - Warning] setMandatory: Unsupported input type:`, input);
            return;
        }

        const requirementLevel: Xrm.Attributes.RequirementLevel = 'required';

        this.setToObject(
            input,
            requirementLevel,
            this.getAttribute,
            this.getAttribute,
            (control, requirementLevel) => control.setRequiredLevel(requirementLevel),
            isAttribute
        );
    };


    /**
     * Sets the visibility of a single control specified by its index, name, or reference.
     *
     * @template T The type of the control, extending Xrm.Controls.Control.
     * @param controlOrOrIndexOrName The index (number), logical name (string), or control reference.
     * @param isVisible A boolean indicating whether the control should be visible.
     */
    public setVisible<T extends Xrm.Controls.Control>(controlOrOrIndexOrName: number | string | T, isVisible: boolean): void;
    /**
     * Sets the visibility of multiple controls specified by an array of indices, names, or references.
     *
     * @template T The type of the controls, extending Xrm.Controls.Control.
     * @param controlArray An array of indices (number), logical names (string), or control references.
     * @param isVisible A boolean indicating whether the controls should be visible.
     */
    public setVisible<T extends Xrm.Controls.Control>(controlArray: (number | string | T)[], isVisible: boolean): void;
    /**
     * Sets the visibility of controls matching the given predicate function.
     *
     * @template T The type of the controls, extending Xrm.Controls.Control.
     * @param delegateFunction A predicate function to filter controls.
     * @param isVisible A boolean indicating whether the controls should be visible.
     */
    public setVisible<T extends Xrm.Controls.Control>(input: T | string | number | (number | string | T)[] | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, isVisible: boolean): void {
        if (!input) {
            warnMessage(`[PrimaryControl - Warning] setVisible: Unsupported input type:`, input);
            return;
        }

        this.setToObject<Xrm.Controls.Control, Xrm.Controls.Control & Xrm.Controls.UiCanSetVisibleElement, boolean>(
            input,
            isVisible,
            this.getControl,
            this.getControl,
            (control, isVisible) => control.setVisible(isVisible),
            isControlCanSetVisible
        );
    };


    /**
     * Sets the disabled state of a single control specified by its index, name, or reference.
     *
     * @template T The type of the control, extending Xrm.Controls.Control.
     * @param controlOrOrIndexOrName The index (number), logical name (string), or control reference.
     * @param isDisabled A boolean indicating whether the control should be disabled.
     */
    public setDisabled<T extends Xrm.Controls.Control>(controlOrOrIndexOrName: number | string | T, isDisabled: boolean): void;
    /**
     * Sets the disabled state of multiple controls specified by an array of indices, names, or references.
     *
     * @template T The type of the controls, extending Xrm.Controls.Control.
     * @param controlArray An array of indices (number), logical names (string), or control references.
     * @param isDisabled A boolean indicating whether the controls should be disabled.
     */
    public setDisabled<T extends Xrm.Controls.Control>(controlArray: (number | string | T)[], isDisabled: boolean): void;
    /**
     * Sets the disabled state of controls matching the given predicate function.
     *
     * @template T The type of the controls, extending Xrm.Controls.Control.
     * @param delegateFunction A predicate function to filter controls.
     * @param isDisabled A boolean indicating whether the controls should be disabled.
     */
    public setDisabled<T extends Xrm.Controls.Control>(input: T | string | number | (number | string | T)[] | Xrm.Collection.MatchingDelegate<Xrm.Controls.Control>, isDisabled: boolean): void {
        if (!input) {
            warnMessage(`[PrimaryControl - Warning] setDisabled: Unsupported input type:`, input);
            return;
        }

        this.setToObject<Xrm.Controls.Control, Xrm.Controls.Control & Xrm.Controls.UiCanSetDisabledElement, boolean>(
            input,
            isDisabled,
            this.getControl,
            this.getControl,
            (control, isDisabled) => control.setDisabled(isDisabled),
            isControlCanSetDisabled
        );
    };


}

export default PrimaryControl;

//#region Types
type GetValueReturnType<T extends Xrm.Attributes.Attribute> = T extends { getValue(): infer R } ? R : null;
type SetValueParamType<T extends Xrm.Attributes.Attribute> = T extends { setValue(value: infer V): void } ? V : never;
//#endregion



//! formContext.ui.quickForms.get