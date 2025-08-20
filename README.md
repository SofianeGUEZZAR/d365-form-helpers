# D365 Form Helpers

Minimal TypeScript helpers that wrap Dynamics 365 / Power Apps client-side `formContext` APIs with typed, ergonomic utilities for form scripting. This repository contains the exact code you provided and concise, copy‑paste examples for every public function.

> Install (single line):

```bash
npm install @sguez/d365-form-helpers
```

### TypeScript configuration

It is recommended to set the following in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "NodeNext",
    "module": "NodeNext"
  }
}
```

---

## Purpose

Make Dynamics client scripting:

* typed and readable,
* flexible (accepts name, index, array, matching delegate or instance),
* less boilerplate when attaching handlers or manipulating attributes/controls/tabs.

---

## What’s included

* `Provider.from(context)` — detects context type and returns either `FormContext` or `PrimaryControl`.
* `FormContext` — extends `PrimaryControl` and additionally exposes event-specific helpers bound to the provided `EventContext` (getDepth, getEventSource, getSharedVariable, setSharedVariable, getContext).
* `PrimaryControl` — main helper wrapping `Xrm.FormContext` with convenient methods:

  * safe getters: `getAttribute`, `getControl`, `getTab`, `getSection`, `getAttributeValue`
  * flexible setters: `setAttributeValue`, `setRequiredLevel`, `setOptional`, `setRecommended`, `setMandatory`, `setVisible`, `setDisabled`
  * (bulk operations supporting names, indexes, arrays, delegates and direct instances)
  * Event setters: `addOnLoad`, `addOnSave`, `addOnChange`, `addTabStateChange`, `addPreSearch`, `addSubGridOnLoad`, `addOnReadyStateComplete`, `addOnOutputChange`, `addOnResultOpened`, `addOnSelection`, `addOnPostSearch`.
* `TabControl` — wrapper for a single tab providing `getSection`, label methods, visibility and focus helpers.
* `CheckTypes` — runtime type guards for Xrm objects (attributes, controls, tabs, grids, iframes, kb search controls, etc.).

---

## Best practices

* Prefer using `Provider.from(executionContext)` because it directly returns an exploitable `formContext` without worrying about the type of the source object.
* Keep your business logic in TypeScript, compile to a single (minified) JS file for Dynamics web resource consumption.

---

## Quick usage examples

> All examples assume `@types/xrm` is installed as a dev dependency for editor support.

### `Provider.from` — automatic context detection

```ts
import Provider from "@sguez/d365-form-helpers/Provider";

// In an onLoad handler
function onLoad(executionContext: Xrm.Events.EventContext) {
  const formContext: FormContext = Provider.from(executionContext); // returns FormContext
  formContext.setVisible("mobilephone", false);
  console.log("depth:", formContext.getDepth());
}

// In a ribbon action (primaryControl provided)
function ribbonAction(primaryControl: Xrm.FormContext) {
  const formContext: PrimaryControl = Provider.from(primaryControl); // returns PrimaryControl
  formContext.setDisabled("name", true);
}
```

---

### `PrimaryControl` — creation and getters/setters

```ts
import PrimaryControl from "@sguez/d365-form-helpers/PrimaryControl";

function example(executionContext: Xrm.Events.EventContext) {
  const formContext: PrimaryControl = new PrimaryControl(executionContext.getFormContext()); // or use Provider.from(executionContext)

  // Get attribute, control, tab, section
  const attribute = formContext.getAttribute("emailaddress1");
  const control = formContext.getControl("mobilephone");
  const tab = formContext.getTab("Summary");
  const section = formContext.getSection("AddressSection");

  // Read values
  const emailAddress = formContext.getAttributeValue("emailaddress1");
  const values = formContext.getAttributeValue(attribute => attribute.getName().startsWith("_custom_"));

  // Set values
  formContext.setAttributeValue("firstname", "John");
  formContext.setAttributeValue(["firstname", "lastname"], "REDACTED");

  // Requirement level
  formContext.setRequiredLevel("emailaddress1", "required");
  formContext.setOptional("middlename");
  formContext.setRecommended("nickname");
  formContext.setMandatory(["firstname", "lastname"]);

  // Visibility / disabled
  formContext.setVisible("mobilephone", false);
  formContext.setVisible(["mobilephone","telephone1"], true);
  formContext.setVisible(c => c.getName().startsWith("addr_"), false);

  formContext.setDisabled("mobilephone", true);
  formContext.setDisabled(["mobilephone","telephone1"], false);
}
```

---

### `PrimaryControl` — event helpers (examples for each method)

```ts
function registerHandlers(formContext: Xrm.FormContext) {
  const formContext: PrimaryControl = new PrimaryControl(formContext); // or use Provider.from(formContext)

  // Form and data events
  formContext.addOnLoad(ctx => console.log('form loaded'));
  formContext.addOnDataLoad(ctx => console.log('data loaded'));
  formContext.addLoaded(ctx => console.log('ui loaded'));
  formContext.addOnSave(ctx => console.log('on save'));
  formContext.addOnPostSave(ctx => console.log('post save'));

  // Process events
  formContext.addOnPreProcessStatusChange(ctx => console.log('pre process status'));
  formContext.addOnProcessStatusChange(ctx => console.log('process status'));
  formContext.addOnPreStageChange(ctx => console.log('pre stage change'));
  formContext.addOnStageChange(ctx => console.log('stage change'));
  formContext.addOnStageSelected(ctx => console.log('stage selected'));

  // Attribute change
  formContext.addOnChange('emailaddress1', ev => console.log('email changed'));
  formContext.addOnChange(['firstname','lastname'], ev => console.log('name changed'));
  formContext.addOnChange(a => a.getName().startsWith('_custom_'), ev => console.log('custom changed'));

  // Tab state
  formContext.addTabStateChange('Summary', ev => console.log('tab state changed'));

  // Lookup events
  formContext.addOnLookupTagClick('parentaccountid', ev => console.log('lookup tag clicked'));
  formContext.addPreSearch('parentaccountid', () => console.log('presearch'));

  // Grid / subgrid
  formContext.addSubGridOnLoad('ContactsSubgrid', ctx => console.log('subgrid loaded'));
  formContext.addSubGridOnRecordSelect('ContactsSubgrid', ctx => console.log('record selected'));

  // Iframe
  formContext.addOnReadyStateComplete('webresource_iframe', ctx => console.log('iframe ready'));

  // Standard control
  formContext.addOnOutputChange('someControl', ctx => console.log('output changed'));

  // KnowledgeBase Search control
  formContext.addOnResultOpened('kbSearch', ctx => console.log('result opened'));
  formContext.addOnSelection('kbSearch', ctx => console.log('kb selection'));
  formContext.addOnPostSearch('kbSearch', ctx => console.log('post search'));
}
```

---

### `FormContext` — event-aware wrapper

```ts
import { Provider } from "@sguez/d365-form-helpers";

function onChange(executionContext: Xrm.Events.EventContext) {
  const formContext: FormContext = Provider.from(executionContext); // returns FormContext
  const source = formContext.getEventSource();
  const depth = formContext.getDepth();
  formContext.setSharedVariable('myKey', { started: true });
  const shared = formContext.getSharedVariable('myKey');
}
```

---

### `TabControl` usage

```ts
const tab = form.getTab('Summary');
if (tab) {
  const section = tab.getSection('AddressSection');
  section?.setVisible(false);
  tab.setLabel('Main summary');
  tab.setFocus();
}
```

---

### `CheckTypes` — type guard examples

```ts
import { isLookupControl, isGridControl, isAttribute } from "@sguez/d365-form-helpers";

const control = formContext.getControl('parentaccountid'); // control: Xrm.Controls.Control
if (isLookupControl(control)) { // control: Xrm.Controls.LookupControl
  control.addOnLookupTagClick(() => console.log('tag clicked'));
}

const grid = formContext.getControl('contacts'); // grid: Xrm.Controls.Control
if (isGridControl(grid)) { // control: Xrm.Controls.GridControl
  grid.addOnLoad(ctx => console.log('grid loaded'));
}

const attribute = formContext.getAttribute('emailaddress1');
if (isAttribute(attribute)) {
  console.log('attribute type', attribute.getAttributeType());
}
```

---

## Notes & best practices

* The helpers accept multiple input shapes: name (string), index (number), array, predicate delegate or an instance — this reduces branching in your code.
