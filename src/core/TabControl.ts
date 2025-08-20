/**
 * Wrapper class for Xrm.Controls.Tab providing additional typings and helper methods.
 * 
 * Implements the Xrm.Controls.Tab interface by delegating to the wrapped tabControl instance.
 */
export class TabControl implements Xrm.Controls.Tab {
    /** The underlying Dynamics 365 Tab control */
    protected tabControl: Xrm.Controls.Tab;

    /**
     * Constructs a new TabControl wrapper.
     * 
     * @param control The original Xrm.Controls.Tab instance or another TabControl wrapper.
     */
    constructor(control: Xrm.Controls.Tab | TabControl) {
        if (control instanceof TabControl) {
            this.tabControl = control.tabControl;
        }
        else {
            this.tabControl = control;
        }
    }

    /**
     * A reference to the collection of form sections within this tab.
     * @see {@link https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/collections External Link: Collections (Client API reference)}
     */
    get sections() { return this.tabControl.sections; }

    /**
     * Adds a function to be called when the TabStateChange event occurs.
     * @param handler The function to be executed on the TabStateChange event.
     */
    get addTabStateChange() { return this.tabControl.addTabStateChange.bind(this.tabControl); }

    /**
     * Gets display state of the tab.
     * @returns The display state, as either "expanded" or "collapsed"
     */
    get getDisplayState() { return this.tabControl.getDisplayState.bind(this.tabControl); }

    /**
     * Gets the name of the tab.
     * @returns The name.
     */
    get getName() { return this.tabControl.getName.bind(this.tabControl); }

    /**
     * Gets a reference to the {@link FormContext.ui formContext.ui} parent of the tab.
     * @returns The parent.
     */
    get getParent() { return this.tabControl.getParent.bind(this.tabControl); }

    /**
     * Removes a function to be called when the TabStateChange event occurs.
     * @param handler The function to be removed from the TabStateChange event.
     */
    get removeTabStateChange() { return this.tabControl.removeTabStateChange.bind(this.tabControl); }

    /**
     * Sets display state of the tab.
     * @param displayState Display state of the tab, as either "expanded" or "collapsed"
     * @deprecated Deprecated in the 2021 release wave 1 (April 2021). Use the setFocus method in Unified Interface to ensure the correct tab is opened on a form.
     */
    get setDisplayState() { return this.tabControl.setDisplayState.bind(this.tabControl); }

    /**
     * Sets the visibility state.
     * @param visible true to show, false to hide.
     */
    get setVisible() { return this.tabControl.setVisible.bind(this.tabControl); }

    /**
     * Gets the visibility state.
     * @returns true if the tab is visible, otherwise false.
     */
    get getVisible() { return this.tabControl.getVisible.bind(this.tabControl); }

    /**
     * Gets the label.
     * @returns The label.
     */
    get getLabel() { return this.tabControl.getLabel.bind(this.tabControl); }

    /**
     * Sets the label.
     * @param label The label.
     */
    get setLabel() { return this.tabControl.setLabel.bind(this.tabControl); }

    /**
     * Sets focus on the element.
     */
    get setFocus() { return this.tabControl.setFocus.bind(this.tabControl); }


    /**
     * Gets a section by index or name.
     * 
     * @param sectionIndexOrName The index (number) or name (string) of the section to retrieve.
     * @returns The Section if found, or null otherwise.
     */
    public getSection(sectionIndexOrName: number | string): Xrm.Controls.Section | null;
    /**
     * Gets all sections matching the predicate.
     * 
     * @param predicate A filter function to select sections.
     * @returns An array of matching sections.
     */
    public getSection(predicate?: Xrm.Collection.MatchingDelegate<Xrm.Controls.Section>): Xrm.Controls.Section[];
    public getSection(input?: number | string | Xrm.Collection.MatchingDelegate<Xrm.Controls.Section>): Xrm.Controls.Section | Xrm.Controls.Section[] | null {
        if (typeof input === "string" || typeof input === "number") {
            const section = this.tabControl.sections.get(input);
            return section;
        }
        else {
            const sections = this.tabControl.sections.get(input);
            return sections;
        }
    }
}

export default TabControl;
